const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Patient = require("./models/Patient");
const Doctor = require("./models/Doctor");
const Settings = require("./models/Settings");
const PharmacyOrder = require("./models/PharmacyOrder");
const Queue = require("./models/Queue");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smart-clinic";

const AVG_WAIT_MINUTES = 4;
const ALERT_INTERVAL_MS = 30000;
const PRIORITY_KEYWORDS = [
  "chest pain",
  "breathing",
  "stroke",
  "heart",
  "severe bleeding"
];
let latestAlerts = [];

const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const ensureDoctors = async () => {
  const count = await Doctor.countDocuments();
  if (count === 0) {
    // seed a handful of practitioners so the dropdown is never empty
    await Doctor.insertMany([
      { name: "Dr. Ayesha Khan", specialization: "General Medicine" },
      { name: "Dr. Rahul Mehta", specialization: "Pediatrics" },
      { name: "Dr. Zoya Ali", specialization: "Dermatology" },
      { name: "Dr. Sameer Joshi", specialization: "Cardiology" },
      { name: "Dr. Priya Shah", specialization: "Neurology" }
    ]);
  }
};

const buildQueuePayload = async ({ includeServed = false } = {}) => {
  const statuses = includeServed ? ["waiting", "serving", "served"] : ["waiting", "serving"];
  const queue = await Patient.find({ status: { $in: statuses } })
    .populate("doctor")
    .sort({ priority: -1, queueOrder: 1, createdAt: 1 });
  return queue;
};

const computeAverageConsultationMinutes = async (doctorId = null) => {
  // first try to use historical data if available
  const query = {
    consultation_start: { $ne: null },
    consultation_end: { $ne: null }
  };
  if (doctorId) query.doctor = doctorId;
  const recent = await Patient.find(query)
    .sort({ consultation_end: -1 })
    .limit(20);
  if (recent.length) {
    const totalMinutes = recent.reduce((sum, item) => {
      const minutes = Math.max(1, (item.consultation_end - item.consultation_start) / 60000);
      return sum + minutes;
    }, 0);
    return Math.max(2, Math.round(totalMinutes / recent.length));
  }

  // fallback to doctor-specific average if configured
  if (doctorId) {
    const doc = await Doctor.findById(doctorId);
    if (doc && doc.avgConsultationTime) return doc.avgConsultationTime;
  }

  // final fallback to global constant
  return AVG_WAIT_MINUTES;
};

const buildWaitPrediction = async ({ tokenNumber }) => {
  const queue = await buildQueuePayload();
  const patientIndex = queue.findIndex((p) => p.tokenNumber === tokenNumber);
  const currentIndex = queue.findIndex((p) => p.status === "serving");
  const patientsAhead = patientIndex > -1 ? Math.max(0, patientIndex - currentIndex - 1) : 0;
  const avgMinutes = await computeAverageConsultationMinutes();
  const estimatedWait = patientsAhead * avgMinutes;
  const variance = Math.max(2, Math.round(avgMinutes * 0.3));
  const range = `${Math.max(0, estimatedWait - variance)}-${estimatedWait + variance}`;
  const confidence = avgMinutes >= 6 && patientsAhead >= 3 ? "High" : patientsAhead >= 2 ? "Medium" : "Low";
  return {
    estimatedWait,
    range,
    confidence,
    patientsAhead,
    avgMinutes
  };
};

const buildAlerts = async () => {
  const alerts = [];
  const waitingCount = await Patient.countDocuments({ status: "waiting" });
  if (waitingCount > 10) {
    alerts.push({ id: "queue-overload", text: "⚠ Queue overload detected", time: "Just now" });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const doctors = await Doctor.find();
  for (const doctor of doctors) {
    const lastActivity = await Patient.findOne({ doctor: doctor._id, consultation_start: { $ne: null } })
      .sort({ consultation_start: -1 });
    if (lastActivity && lastActivity.consultation_start < tenMinutesAgo && !lastActivity.consultation_end) {
      alerts.push({ id: `doctor-inactive-${doctor._id}`, text: "⚠ Doctor inactive", time: "Just now" });
    }
  }

  const longWaiters = await Patient.find({ status: "waiting", arrival_time: { $lt: new Date(Date.now() - 30 * 60 * 1000) } });
  if (longWaiters.length > 0) {
    alerts.push({ id: "patient-waiting", text: "⚠ Patient waiting too long", time: "Just now" });
  }

  return alerts;
};

const buildAnalyticsInsights = async () => {
  const served = await Patient.find({ status: "served", consultation_start: { $ne: null }, consultation_end: { $ne: null } })
    .populate("doctor");
  if (served.length === 0) {
    return {
      peakHours: "--",
      averageConsultation: "--",
      busiestDoctor: "--",
      longestWaitDay: "--"
    };
  }

  const hourCounts = {};
  const doctorCounts = {};
  const dayWaits = {};
  let totalMinutes = 0;
  served.forEach((item) => {
    const hour = new Date(item.consultation_start).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    const doctorName = item.doctor?.name || "Unknown";
    doctorCounts[doctorName] = (doctorCounts[doctorName] || 0) + 1;
    const day = new Date(item.consultation_start).toLocaleDateString("en-US", { weekday: "long" });
    const waitMinutes = Math.max(1, (item.consultation_start - item.arrival_time) / 60000);
    dayWaits[day] = (dayWaits[day] || 0) + waitMinutes;
    totalMinutes += Math.max(1, (item.consultation_end - item.consultation_start) / 60000);
  });

  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const busiestDoctor = Object.entries(doctorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const longestWaitDay = Object.entries(dayWaits).sort((a, b) => b[1] - a[1])[0]?.[0];
  const averageConsultation = Math.round(totalMinutes / served.length);

  const formatHour = (hour) => {
    const wrapped = ((Number(hour) % 24) + 24) % 24;
    const period = wrapped >= 12 ? "PM" : "AM";
    const display = wrapped % 12 === 0 ? 12 : wrapped % 12;
    return `${String(display).padStart(2, "0")}:00 ${period}`;
  };

  return {
    peakHours: peakHour !== undefined ? `${formatHour(peakHour)} - ${formatHour(Number(peakHour) + 2)}` : "--",
    averageConsultation: `${averageConsultation} minutes`,
    busiestDoctor: busiestDoctor || "--",
    longestWaitDay: longestWaitDay || "--"
  };
};

const emitQueueUpdate = async () => {
  const queue = await buildQueuePayload();
  io.emit("queueUpdated", queue);

  const totalToday = await Patient.countDocuments({ dateKey: getTodayKey() });
  const servedToday = await Patient.countDocuments({
    dateKey: getTodayKey(),
    status: "served"
  });
  const waiting = await Patient.countDocuments({
    dateKey: getTodayKey(),
    status: "waiting"
  });
  const avgWait = AVG_WAIT_MINUTES;
  io.emit("analyticsUpdated", {
    totalToday,
    servedToday,
    waiting,
    avgWait
  });
  latestAlerts = await buildAlerts();
  io.emit("aiAlertsUpdated", latestAlerts);
};

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await ensureDoctors();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Mongo connection error", err);
  });

io.on("connection", async (socket) => {
  const queue = await buildQueuePayload();
  socket.emit("queueUpdated", queue);
});

app.get("/api/doctors", async (_req, res) => {
  try {
    const doctors = await Doctor.find().sort({ name: 1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
});

// allow adding new doctors (admin/front‑desk)
app.post("/api/doctors", async (req, res) => {
  try {
    const { name, specialization } = req.body;
    if (!name || !specialization) {
      return res.status(400).json({ message: "Name and specialization required" });
    }
    const doctor = await Doctor.create({ name, specialization });
    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Failed to create doctor" });
  }
});

app.post("/api/patient/register", async (req, res) => {
  try {
    const { name, doctorId, symptoms } = req.body;
    if (!name || !doctorId) {
      return res.status(400).json({ message: "Name and doctor are required" });
    }

    const symptomText = String(symptoms || "").toLowerCase();
    const priority = PRIORITY_KEYWORDS.some((keyword) => symptomText.includes(keyword));

    const dateKey = getTodayKey();
    const counter = await Queue.findOneAndUpdate(
      { dateKey },
      priority ? { $inc: { currentPriorityNumber: 1 } } : { $inc: { currentNumber: 1 } },
      { new: true, upsert: true }
    );

    const tokenNumber = priority
      ? `P${counter.currentPriorityNumber}`
      : `A${counter.currentNumber}`;
    const patient = await Patient.create({
      name,
      doctor: doctorId,
      tokenNumber,
      priority,
      symptoms: symptomText,
      queueOrder: Date.now(),
      patient_queue: Date.now(),
      status: "waiting",
      arrival_time: new Date(),
      dateKey
    });

    const queue = await buildQueuePayload();
    const patientIndex = queue.findIndex((p) => p.tokenNumber === tokenNumber);
    const currentIndex = queue.findIndex((p) => p.status === "serving");
    const patientsAhead = patientIndex > -1 ? Math.max(0, patientIndex - currentIndex - 1) : 0;
    const estimatedWait = patientsAhead * AVG_WAIT_MINUTES;

    await emitQueueUpdate();

    res.json({
      tokenNumber,
      patientsAhead,
      estimatedWait,
      priority,
      patientId: patient._id,
      alert: priority ? "⚠ Emergency case detected" : null
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
});

app.get("/api/queue", async (req, res) => {
  try {
    const includeServed = req.query.includeServed === "true";
    const queue = await buildQueuePayload({ includeServed });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: "Failed to load queue" });
  }
});

app.post("/api/queue/next", async (_req, res) => {
  try {
    const currentServing = await Patient.findOne({ status: "serving" });
    if (currentServing) {
      currentServing.status = "served";
      currentServing.consultation_end = new Date();
      await currentServing.save();
    }

    const nextPatient = await Patient.findOne({ status: "waiting" }).sort({ priority: -1, queueOrder: 1, createdAt: 1 });
    if (nextPatient) {
      nextPatient.status = "serving";
      nextPatient.consultation_start = new Date();
      await nextPatient.save();
    }

    await emitQueueUpdate();

    res.json({ current: currentServing, next: nextPatient });
  } catch (error) {
    res.status(500).json({ message: "Failed to call next patient" });
  }
});

app.delete("/api/patient/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Patient.findByIdAndDelete(id);
    await emitQueueUpdate();
    res.json({ message: "Patient removed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete patient" });
  }
});

app.patch("/api/patient/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }
    const patient = await Patient.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("doctor");
    await emitQueueUpdate();
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: "Failed to update patient status" });
  }
});

app.patch("/api/queue/reorder", async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ message: "Order array required" });
    }

    const bulkOps = order.map((item, index) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { queueOrder: item.queueOrder ?? index } }
      }
    }));

    if (bulkOps.length > 0) {
      await Patient.bulkWrite(bulkOps);
    }
    await emitQueueUpdate();
    res.json({ message: "Queue reordered" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reorder queue" });
  }
});

app.get("/api/dashboard/analytics", async (_req, res) => {
  try {
    const dateKey = getTodayKey();
    const servedToday = await Patient.find({
      dateKey,
      status: "served",
      consultation_start: { $ne: null },
      consultation_end: { $ne: null }
    });

    const waitTimes = servedToday
      .map((patient) => Math.max(1, (patient.consultation_start - patient.arrival_time) / 60000))
      .filter((value) => Number.isFinite(value));
    const averageWaitTime = waitTimes.length
      ? Math.round(waitTimes.reduce((sum, value) => sum + value, 0) / waitTimes.length)
      : 0;
    const longestWaitTime = waitTimes.length ? Math.round(Math.max(...waitTimes)) : 0;

    const currentQueueLength = await Patient.countDocuments({ status: "waiting" });

    res.json({
      patientsServedToday: servedToday.length,
      averageWaitTime,
      longestWaitTime,
      currentQueueLength
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load dashboard analytics" });
  }
});

app.get("/api/ai/wait-time/:token", async (req, res) => {
  try {
    const tokenNumber = req.params.token;
    const prediction = await buildWaitPrediction({ tokenNumber });
    res.json({
      estimatedWait: prediction.estimatedWait,
      range: prediction.range,
      confidence: prediction.confidence
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate wait prediction" });
  }
});

app.get("/api/ai/best-doctor", async (_req, res) => {
  try {
    const doctors = await Doctor.find();
    const queueCounts = await Promise.all(
      doctors.map(async (doctor) => {
        const count = await Patient.countDocuments({ doctor: doctor._id, status: "waiting" });
        const avgMinutes = await computeAverageConsultationMinutes(doctor._id);
        return { doctor, count, avgMinutes };
      })
    );
    const best = queueCounts.sort((a, b) => a.count - b.count)[0];
    res.json({
      doctor: best?.doctor?.name || "--",
      doctorId: best?.doctor?._id || null,
      queueLength: best?.count ?? 0,
      estimatedWait: (best?.count ?? 0) * (best?.avgMinutes ?? AVG_WAIT_MINUTES)
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to recommend doctor" });
  }
});

app.post("/api/ai/optimize-queue", async (_req, res) => {
  try {
    // load all waiting patients with doctor info
    const waiting = await Patient.find({ status: "waiting" }).populate("doctor");

    // group doctors by specialization (default to General Medicine)
    const doctors = await Doctor.find();
    const groups = {}; // spec => [{doctor, count}]
    doctors.forEach((doc) => {
      const spec = doc.specialization || "General Medicine";
      if (!groups[spec]) groups[spec] = [];
      groups[spec].push({ doctor: doc, count: 0 });
    });

    // tally counts
    waiting.forEach((p) => {
      const spec = p.doctor?.specialization || "General Medicine";
      const list = groups[spec] || groups["General Medicine"] || [];
      const entry = list.find((e) => e.doctor._id.equals(p.doctor?._id));
      if (entry) entry.count += 1;
    });

    let overallSuggestion = null;

    // iterate each group and balance within it
    for (const spec in groups) {
      const list = groups[spec];
      if (list.length < 2) continue;
      const sorted = list.sort((a, b) => b.count - a.count);
      const max = sorted[0];
      const min = sorted[sorted.length - 1];
      const diff = max.count - min.count;
      if (diff <= 5) continue;
      const moveCount = Math.min(2, Math.floor(diff / 2));

      const patientsToMove = await Patient.find({ doctor: max.doctor._id, status: "waiting" })
        .sort({ priority: -1, queueOrder: 1, createdAt: 1 })
        .limit(moveCount);

      const ids = patientsToMove.map((p) => p._id);
      if (ids.length) {
        await Patient.updateMany(
          { _id: { $in: ids } },
          { $set: { doctor: min.doctor._id, queueOrder: Date.now() } }
        );
        overallSuggestion = {
          spec,
          from: max.doctor.name,
          to: min.doctor.name,
          moved: ids.length
        };
      }
    }

    // emit updated queue to all clients and notify optimization
    await emitQueueUpdate();
    io.emit("queueOptimized", overallSuggestion);

    res.json({ suggestion: overallSuggestion });
  } catch (error) {
    res.status(500).json({ message: "Failed to optimize queue" });
  }
});

app.get("/api/ai/alerts", async (_req, res) => {
  try {
    res.json({ alerts: latestAlerts });
  } catch (error) {
    res.status(500).json({ message: "Failed to load alerts" });
  }
});

app.get("/api/ai/analytics-insights", async (_req, res) => {
  try {
    const insights = await buildAnalyticsInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: "Failed to load AI insights" });
  }
});

setInterval(async () => {
  latestAlerts = await buildAlerts();
  io.emit("aiAlertsUpdated", latestAlerts);
}, ALERT_INTERVAL_MS);

// --------------------------------------------------------------------------------
// Pharmacy order endpoints
// --------------------------------------------------------------------------------

app.post("/api/pharmacy/order", async (req, res) => {
  try {
    const { patientId, medicines, prescriptionImage, totalAmount } = req.body;
    if (!patientId || !medicines || totalAmount == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const order = await PharmacyOrder.create({
      patient: patientId,
      medicines,
      prescriptionImage,
      totalAmount
    });
    // optionally notify admin via socket
    io.emit("pharmacyOrderCreated", order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to create order" });
  }
});

app.get("/api/pharmacy/orders", async (req, res) => {
  try {
    const { status, paymentStatus, search, startDate, endDate } = req.query;
    const query = {};

    // Status filter
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Get all orders matching filters (will search patient details after population)
    let orders = await PharmacyOrder.find(query)
      .populate("patient", "name tokenNumber")
      .sort({ createdAt: -1 });

    // Search filter (by patient name or token)
    if (search) {
      const searchLower = search.toLowerCase();
      orders = orders.filter(order => {
        const patientName = order.patient?.name?.toLowerCase() || "";
        const tokenNumber = order.patient?.tokenNumber?.toString().toLowerCase() || "";
        return (
          patientName.includes(searchLower) ||
          tokenNumber.includes(searchLower)
        );
      });
    }

    res.json(orders);
  } catch (err) {
    console.error("Error fetching pharmacy orders:", err);
    res.status(500).json({ message: "Failed to load orders" });
  }
});

// allow updating order status (and optionally other fields)
app.patch("/api/pharmacy/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const order = await PharmacyOrder.findByIdAndUpdate(id, update, { new: true }).populate("patient", "name tokenNumber");
    if (!order) return res.status(404).json({ message: "Order not found" });
    io.emit("pharmacyOrderUpdated", order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to update order" });
  }
});

// Mark payment (update payment status)
app.patch("/api/pharmacy/orders/:id/payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMethod, paidAmount } = req.body;
    
    const update = {
      paymentStatus,
      paymentDate: new Date(),
      notificationSent: true
    };
    
    if (paymentMethod) update.paymentMethod = paymentMethod;
    if (paidAmount !== undefined) update.paidAmount = paidAmount;
    
    const order = await PharmacyOrder.findByIdAndUpdate(id, update, { new: true })
      .populate("patient", "name tokenNumber");
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    io.emit("pharmacyOrderUpdated", order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to update payment" });
  }
});

// --------------------------------------------------------------------------------
// Settings endpoints
// --------------------------------------------------------------------------------

app.get("/api/settings", async (_req, res) => {
  try {
    let cfg = await Settings.findOne();
    if (!cfg) {
      cfg = await Settings.create({});
    }
    res.json(cfg);
  } catch (error) {
    res.status(500).json({ message: "Failed to load settings" });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const update = req.body;
    let cfg = await Settings.findOne();
    if (!cfg) {
      cfg = await Settings.create(update);
    } else {
      Object.assign(cfg, update);
      await cfg.save();
    }
    // if any relevant field changed, propagate
    io.emit("settingsUpdated", cfg);
    // emit queue update to refresh waits if admins changed tokens/prefix etc.
    await emitQueueUpdate();
    res.json(cfg);
  } catch (error) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

app.post("/api/settings/doctors", async (req, res) => {
  try {
    const { action, doctor } = req.body;
    let result;
    if (action === "add") {
      result = await Doctor.create(doctor);
    } else if (action === "edit") {
      result = await Doctor.findByIdAndUpdate(doctor._id, doctor, { new: true });
      // if avgConsultationTime changed, refresh queue
      await emitQueueUpdate();
    } else if (action === "remove") {
      result = await Doctor.findByIdAndDelete(doctor._id);
    } else {
      return res.status(400).json({ message: "Unknown action" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to modify doctor" });
  }
});

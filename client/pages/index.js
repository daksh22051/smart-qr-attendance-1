import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import {
  fetchDoctors,
  registerPatient,
  fetchQueue,
  callNext,
  fetchWaitPrediction,
  fetchBestDoctor,
  optimizeQueue,
  fetchDashboardAnalytics
} from "../lib/api";
import { socket } from "../lib/socket";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [name, setName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const speechRef = useRef(null);
  const [aiWait, setAiWait] = useState(null);
  const [bestDoctor, setBestDoctor] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiAlertMessage, setAiAlertMessage] = useState("");
  const [dashboardAnalytics, setDashboardAnalytics] = useState({
    patientsServedToday: 0,
    averageWaitTime: 0,
    longestWaitTime: 0,
    currentQueueLength: 0
  });
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [queueData, setQueueData] = useState({
    currentToken: null,
    nextToken: null,
    queue: [],
    patientsAhead: 0,
    estimatedWait: 0
  });

  useEffect(() => {
    fetchDoctors()
      .then((data) => {
        setDoctors(data);
        if (data[0]) setDoctorId(data[0]._id);
      })
      .catch(() => setError("Unable to load doctors"));
  }, []);

  useEffect(() => {
    let active = true;
    const loadBestDoctor = async () => {
      try {
        const data = await fetchBestDoctor();
        if (active) setBestDoctor(data);
      } catch (error) {
        // ignore
      }
    };
    loadBestDoctor();
    const interval = setInterval(loadBestDoctor, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadQueue = async () => {
      try {
        const data = await fetchQueue();
        const queue = data.map((p) => p.tokenNumber);
        const current = data.find((p) => p.status === "serving");
        const waiting = data.filter((p) => p.status === "waiting");
        const next = waiting[0];
        const tokenNumber = result?.tokenNumber || null;
        const patientIndex = tokenNumber ? queue.indexOf(tokenNumber) : -1;
        const currentIndex = current ? queue.indexOf(current.tokenNumber) : -1;
        const patientsAhead = patientIndex > -1 ? Math.max(0, patientIndex - currentIndex - 1) : waiting.length;
        const estimatedWait = patientsAhead * 4;

        if (active) {
          setQueueData({
            currentToken: current?.tokenNumber || null,
            nextToken: next?.tokenNumber || null,
            queue,
            patientsAhead,
            estimatedWait
          });
        }
      } catch (err) {
        // ignore
      }
    };

    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    socket.connect();
    socket.on("queueUpdated", loadQueue);
    socket.on("queueOptimized", (suggestion) => {
      if (suggestion) setAiSuggestion(suggestion);
    });

    return () => {
      active = false;
      clearInterval(interval);
      socket.off("queueUpdated", loadQueue);
      socket.off("queueOptimized");
      socket.disconnect();
    };
  }, [result]);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setSymptoms(transcript.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setSpeechError("Microphone permission denied. Please allow access.");
      } else {
        setSpeechError("Voice input error. Please try again.");
      }
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    speechRef.current = recognition;
  }, []);

  const toggleListening = () => {
    setSpeechError("");
    if (!speechSupported || !speechRef.current) {
      setSpeechError("Voice input not supported in this browser.");
      return;
    }
    if (isListening) {
      speechRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      speechRef.current.start();
      setIsListening(true);
    } catch (error) {
      setSpeechError("Unable to start voice input.");
      setIsListening(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await registerPatient({ name, doctorId, symptoms });
      setResult(response);
      if (response?.alert) {
        setAiAlertMessage(response.alert);
        setTimeout(() => setAiAlertMessage(""), 4000);
      }
      setName("");
      setSymptoms("");
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    try {
      await callNext();
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!result) return;
    const totalSeconds = Math.max(0, result.estimatedWait * 60 - result.patientsAhead * 30);
    setCountdown(totalSeconds);
  }, [result]);

  useEffect(() => {
    let active = true;
    const loadPrediction = async () => {
      if (!result?.tokenNumber) return;
      try {
        const data = await fetchWaitPrediction(result.tokenNumber);
        if (active) setAiWait(data);
      } catch (error) {
        // ignore
      }
    };
    loadPrediction();
    const interval = setInterval(loadPrediction, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [result?.tokenNumber]);

  useEffect(() => {
    let active = true;
    const loadAnalytics = async () => {
      try {
        const data = await fetchDashboardAnalytics();
        if (active) setDashboardAnalytics(data);
      } catch (error) {
        // ignore
      }
    };
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 5000);
    socket.on("queueUpdated", loadAnalytics);
    return () => {
      active = false;
      clearInterval(interval);
      socket.off("queueUpdated", loadAnalytics);
    };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const [activeRole, setActiveRole] = useState("reception");

  useEffect(() => {
    if (!result) return;
    const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
    audio.play().catch(() => null);
  }, [result]);

  const formatCountdown = (seconds) => {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  const exportReport = () => {
    const headers = ["Token", "Name", "Doctor", "Status", "Date"];
    const rows = [
      ["A10", "Sana R.", "Dr. Ayesha Khan", "served", now.toISOString()],
      ["A11", "Raj P.", "Dr. Rahul Mehta", "waiting", now.toISOString()],
      ["A12", name || "You", "Dr. Zoya Ali", "waiting", now.toISOString()]
    ];
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "clinic-queue-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const previewData = result || {
    tokenNumber: "A12",
    patientsAhead: queueData.patientsAhead || 2,
    estimatedWait: queueData.estimatedWait || 10
  };
  const progressValue = queueData.queue.length
    ? Math.min(95, Math.max(10, ((queueData.queue.indexOf(queueData.currentToken) + 1) / queueData.queue.length) * 100))
    : 0;
  const isTurnSoon = previewData.patientsAhead <= 2;
  const queueTokens = queueData.queue;
  const currentToken = queueData.currentToken || null;
  const nextToken = queueData.nextToken || null;
  const stats = [
    {
      label: "Patients Served Today",
      value: dashboardAnalytics.patientsServedToday,
      icon: (
        <svg className="h-5 w-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 13h6l2 2 4-6h4" />
          <path d="M20 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
        </svg>
      )
    },
    {
      label: "Average Wait Time",
      value: `${dashboardAnalytics.averageWaitTime} min`,
      icon: (
        <svg className="h-5 w-5 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      )
    },
    {
      label: "Longest Wait Time",
      value: `${dashboardAnalytics.longestWaitTime} min`,
      icon: (
        <svg className="h-5 w-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 5v7" />
          <path d="M12 17h.01" />
          <path d="M5 19h14l-7-14-7 14Z" />
        </svg>
      )
    },
    {
      label: "Current Queue Length",
      value: dashboardAnalytics.currentQueueLength,
      icon: (
        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      )
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-semibold text-slate-800">Clinic Queue Dashboard</h1>
                <p className="text-slate-500">Focused views for reception, patient, and admin operations.</p>
              </div>
              <div className="flex flex-wrap gap-2 rounded-full bg-white p-2 shadow-sm border border-slate-100">
                {[
                  { id: "reception", label: "Reception" },
                  { id: "patient", label: "Patient" },
                  { id: "admin", label: "Admin" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRole(tab.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeRole === tab.id
                        ? "bg-clinic-100 text-clinic-700 shadow"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeRole === "reception" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-800">Currently Serving</h2>
                        <p className="text-sm text-slate-500">Live queue focus for reception.</p>
                      </div>
                      <div className="rounded-2xl bg-clinic-50 px-4 py-2 text-xl font-semibold text-clinic-700">
                        {currentToken || "--"}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-xs uppercase text-slate-400">Next in line</p>
                        <p className="text-lg font-semibold text-slate-700">{nextToken || "--"}</p>
                      </div>
                      <button
                        onClick={handleCallNext}
                        className="rounded-xl bg-clinic-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700"
                      >
                        Call Next
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm" id="patient-registration">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-800">Add Patient</h2>
                        <p className="text-sm text-slate-500">Quick registration for new arrivals.</p>
                      </div>
                      <span className="text-xs text-slate-400">Step 1 of 1</span>
                    </div>
                    <form className="mt-6 grid grid-cols-1 gap-4" onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                          value={mobileNumber}
                          onChange={(event) => {
                            setMobileNumber(event.target.value);
                            if (!name && event.target.value.replace(/\D/g, "").length >= 10) {
                              setName("Returning Patient");
                            }
                          }}
                          placeholder="Mobile number"
                          inputMode="numeric"
                        />
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 flex items-center justify-center">
                          Auto-fetch
                        </div>
                      </div>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Patient name"
                        required
                      />
                      <select
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                        value={doctorId}
                        onChange={(event) => setDoctorId(event.target.value)}
                        required
                      >
                        <option value="" disabled>
                          {doctors.length ? "Select doctor" : "Loading doctors..."}
                        </option>
                        {doctors.map((doc) => (
                          <option key={doc._id} value={doc._id}>
                            {doc.name} - {doc.specialization}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm focus:border-clinic-400 focus:outline-none"
                          value={symptoms}
                          onChange={(event) => setSymptoms(event.target.value)}
                          placeholder="Symptoms (optional)"
                        />
                        <button
                          type="button"
                          onClick={toggleListening}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full border flex items-center justify-center transition ${
                            isListening
                              ? "bg-rose-100 border-rose-200 text-rose-600"
                              : "bg-white border-slate-200 text-slate-500"
                          }`}
                          title="Voice input"
                        >
                          🎙️
                        </button>
                      </div>
                      {speechError && (
                        <p className="text-xs text-rose-600">{speechError}</p>
                      )}
                      {error && <p className="text-sm text-rose-600">{error}</p>}
                      <button
                        disabled={loading}
                        className="w-full rounded-2xl bg-clinic-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 disabled:opacity-60"
                      >
                        {loading ? "Generating..." : "Generate Token"}
                      </button>
                    </form>
                    {aiAlertMessage && (
                      <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">
                        {aiAlertMessage}
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Queue Timeline</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {queueTokens.length === 0 ? (
                        <p className="text-sm text-slate-500">Queue is empty.</p>
                      ) : (
                        queueTokens.map((token) => (
                          <span
                            key={token}
                            className={`rounded-full px-4 py-2 text-sm font-semibold border ${
                              token === currentToken
                                ? "border-clinic-200 bg-clinic-50 text-clinic-700"
                                : token === nextToken
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {token}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Reception Snapshot</h3>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">Patients Ahead</p>
                        <p className="text-2xl font-semibold text-slate-700">{previewData.patientsAhead}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">Est. Wait</p>
                        <p className="text-2xl font-semibold text-slate-700">{previewData.estimatedWait} min</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">System Status</p>
                        <p className="text-sm font-semibold text-emerald-600">Active</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3" suppressHydrationWarning>
                        <p className="text-xs uppercase text-slate-400">Local Time</p>
                        <p className="text-sm font-semibold text-slate-700">{mounted ? now.toLocaleTimeString() : "--:--"}</p>
                      </div>
                    </div>
                  </div>

                  {bestDoctor && (
                    <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-slate-800">Best Doctor Match</h3>
                      <p className="mt-2 text-sm text-slate-500">Suggested assignment for shortest wait.</p>
                      <div className="mt-4 rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm text-indigo-700">
                        {bestDoctor.doctor} · Queue {bestDoctor.queueLength} · {bestDoctor.estimatedWait} min
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeRole === "patient" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-800">Your Token Status</h2>
                    <p className="text-sm text-slate-500">Track your position in the queue.</p>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-2xl bg-clinic-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">Your Token</p>
                        <p className="text-2xl font-semibold text-clinic-700">{previewData.tokenNumber}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">Ahead of You</p>
                        <p className="text-2xl font-semibold text-slate-700">{previewData.patientsAhead}</p>
                      </div>
                      <div className="rounded-2xl bg-rose-50 px-4 py-3">
                        <p className="text-xs uppercase text-slate-400">Est. Wait</p>
                        <p className="text-2xl font-semibold text-rose-600">
                          {aiWait ? `${aiWait.estimatedWait} min` : `${previewData.estimatedWait} min`}
                        </p>
                      </div>
                    </div>
                    {aiWait && (
                      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
                        Prediction Range: {aiWait.range} min · Confidence: {aiWait.confidence}
                      </div>
                    )}
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Now Serving</h3>
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-2xl font-semibold text-slate-700">
                      {currentToken || "--"}
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Next: <span className="font-semibold text-slate-700">{nextToken || "--"}</span>
                    </div>
                    <button
                      className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View Live Display
                    </button>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Your Turn In</h3>
                    <div className="mt-4 text-4xl font-semibold text-indigo-600">{formatCountdown(countdown)}</div>
                    {isTurnSoon && (
                      <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
                        Please stay nearby — you are close to being called.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeRole === "admin" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-800">Operational Analytics</h2>
                        <p className="text-sm text-slate-500">Quick insights for admin oversight.</p>
                      </div>
                      <button
                        onClick={exportReport}
                        className="rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600"
                      >
                        Export Report
                      </button>
                    </div>
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-xs uppercase text-slate-400">
                            <span className="h-8 w-8 rounded-2xl bg-white flex items-center justify-center">
                              {stat.icon}
                            </span>
                            {stat.label}
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-slate-700">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Queue Heatmap</h3>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "9 AM", level: "bg-teal-200" },
                        { label: "11 AM", level: "bg-indigo-200" },
                        { label: "2 PM", level: "bg-blue-200" }
                      ].map((slot) => (
                        <div key={slot.label} className="text-xs text-slate-500">
                          <div className={`h-16 rounded-2xl ${slot.level}`} />
                          <div className="mt-2 text-center">{slot.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800">Optimization</h3>
                    <p className="mt-2 text-sm text-slate-500">Use AI to rebalance doctor loads.</p>
                    {aiSuggestion ? (
                      <div className="mt-3 text-sm text-indigo-700">
                        Queue optimized — moved {aiSuggestion.moved} patients to {aiSuggestion.to}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">No optimization applied.</div>
                    )}
                    <button
                      onClick={async () => {
                        if (optimizeLoading) return;
                        setOptimizeLoading(true);
                        try {
                          const data = await optimizeQueue();
                          if (data?.suggestion) {
                            setAiSuggestion(data.suggestion);
                          }
                        } catch (error) {
                          // ignore
                        }
                        setOptimizeLoading(false);
                      }}
                      className="mt-4 w-full rounded-2xl bg-clinic-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clinic-700 disabled:opacity-60"
                      disabled={optimizeLoading}
                    >
                      {optimizeLoading ? "Optimizing..." : "Apply Optimization"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

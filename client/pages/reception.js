import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import {
  fetchQueueWithServed,
  removePatient,
  registerPatient,
  fetchDoctors,
  createDoctor,
  updatePatientStatus,
  reorderQueue,
  callNext
} from "../lib/api";
import { socket } from "../lib/socket";
import { motion } from "framer-motion";

export default function Reception() {
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  // new-doctor form state
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorSpec, setNewDoctorSpec] = useState("");
  const [doctorError, setDoctorError] = useState("");

  const [name, setName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [priority, setPriority] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchQueueWithServed().then(setQueue);
    fetchDoctors().then((data) => {
      setDoctors(data);
      if (data[0]) setDoctorId(data[0]._id);
    });
    socket.connect();
    socket.on("queueUpdated", setQueue);

    return () => {
      socket.off("queueUpdated", setQueue);
      socket.disconnect();
    };
  }, []);

  const handleAdd = async (event) => {
    event.preventDefault();
    await registerPatient({ name, doctorId, priority, symptoms });
    setName("");
    setPriority(false);
    setSymptoms("");
  };

  const handleRemove = async (id) => {
    await removePatient(id);
  };

  const handleComplete = async (id) => {
    await updatePatientStatus(id, "served");
  };

  const handleCallNext = async () => {
    await callNext();
  };

  const handleDragStart = (event, id) => {
    event.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = async (event, targetId) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const updated = [...filteredQueue];
    const sourceIndex = updated.findIndex((p) => p._id === sourceId);
    const targetIndex = updated.findIndex((p) => p._id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);

    const order = updated.map((item, index) => ({ id: item._id, queueOrder: index }));
    await reorderQueue(order);
  };

  const exportQueue = () => {
    const headers = ["Token", "Patient", "Doctor", "Status", "Position"];
    const rows = filteredQueue.map((patient, index) => [
      patient.tokenNumber,
      patient.name,
      patient.doctor?.name || "",
      patient.status,
      index + 1
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "queue-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const filteredQueue = useMemo(() => {
    return queue
      .filter((patient) => (doctorFilter === "all" ? true : patient.doctor?._id === doctorFilter))
      .filter((patient) => (statusFilter === "all" ? true : patient.status === statusFilter))
      .filter((patient) => patient.name.toLowerCase().includes(search.toLowerCase()));
  }, [queue, doctorFilter, statusFilter, search]);

  const summary = useMemo(() => {
    const waiting = queue.filter((p) => p.status === "waiting").length;
    const serving = queue.filter((p) => p.status === "serving").length;
    const completed = queue.filter((p) => p.status === "served").length;
    return { waiting, serving, completed, avgWait: 12 };
  }, [queue]);

  const getStatusBadge = (status) => {
    if (status === "waiting") return "bg-amber-50 text-amber-700";
    if (status === "serving") return "bg-blue-50 text-blue-700";
    return "bg-emerald-50 text-emerald-700";
  };

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          {/* doctor management panel */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-clinic-700">Manage Doctors</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setDoctorError("");
                try {
                  await createDoctor({ name: newDoctorName, specialization: newDoctorSpec });
                  const updated = await fetchDoctors();
                  setDoctors(updated);                  if (!doctorId && updated[0]) setDoctorId(updated[0]._id);                  setNewDoctorName("");
                  setNewDoctorSpec("");
                } catch (err) {
                  setDoctorError(err.message || "Failed to add doctor");
                }
              }}
            >
              <div className="relative rounded-2xl bg-white/80 border border-white/60 px-4 py-3 shadow">
                <input
                  className="w-full bg-transparent focus:outline-none"
                  placeholder="Doctor name"
                  value={newDoctorName}
                  onChange={(ev) => setNewDoctorName(ev.target.value)}
                  required
                />
              </div>
              <div className="relative rounded-2xl bg-white/80 border border-white/60 px-4 py-3 shadow">
                <input
                  className="w-full bg-transparent focus:outline-none"
                  placeholder="Specialization"
                  value={newDoctorSpec}
                  onChange={(ev) => setNewDoctorSpec(ev.target.value)}
                  required
                />
              </div>
              {doctorError && <div className="text-sm text-red-600">{doctorError}</div>}
              <button className="w-full btn-gradient py-3">Add Doctor</button>
            </form>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold text-clinic-700">Add Patient</h2>
            <form className="mt-4 space-y-4" onSubmit={handleAdd}>
              <div className="relative rounded-2xl bg-white/80 border border-white/60 px-4 py-3 shadow">
                <span className="absolute left-4 top-4 text-slate-400">👤</span>
                <input
                  className="w-full bg-transparent pl-8 focus:outline-none"
                  placeholder="Patient name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="relative rounded-2xl bg-white/80 border border-white/60 px-4 py-3 shadow">
                <span className="absolute left-4 top-4 text-slate-400">🩺</span>
                <select
                  className="w-full bg-transparent pl-8 focus:outline-none"
                  value={doctorId}
                  onChange={(event) => setDoctorId(event.target.value)}
                >
                  <option value="" disabled hidden>
                    {doctors.length ? "Select a doctor" : "Loading doctors..."}
                  </option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative rounded-2xl bg-white/80 border border-white/60 px-4 py-3 shadow">
                <span className="absolute left-4 top-4 text-slate-400">🧠</span>
                <input
                  className="w-full bg-transparent pl-8 focus:outline-none"
                  placeholder="Symptoms (e.g., chest pain, breathing issue)"
                  value={symptoms}
                  onChange={(event) => setSymptoms(event.target.value)}
                />
              </div>
              <label className="flex items-center justify-between text-sm text-slate-600">
                Priority (Emergency)
                <input
                  type="checkbox"
                  checked={priority}
                  onChange={(event) => setPriority(event.target.checked)}
                  className="h-4 w-4"
                />
              </label>
              {priority && (
                <div className="text-xs text-rose-600">Emergency patient will be prioritized.</div>
              )}
              <button className="w-full btn-gradient py-3">
                Add Patient
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Patients Waiting", value: summary.waiting, icon: "⏳" },
              { label: "Being Served", value: summary.serving, icon: "🩺" },
              { label: "Completed Today", value: summary.completed, icon: "✅" },
              { label: "Average Wait Time", value: `${summary.avgWait} min`, icon: "⏱️" }
            ].map((card) => (
              <motion.div key={card.label} className="glass-card p-4" whileHover={{ y: -3 }}>
                <div className="text-xs text-slate-500 uppercase flex items-center gap-2">
                  <span>{card.icon}</span>
                  {card.label}
                </div>
                <motion.div
                  className="text-2xl font-semibold text-slate-700 mt-2"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  {card.value}
                </motion.div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card p-6">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <h2 className="text-xl font-semibold text-clinic-700">Queue Management</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportQueue}
                  className="px-3 py-2 rounded-2xl bg-indigo-50 text-indigo-600 text-sm"
                >
                  Export CSV
                </button>
                <select
                  className="px-3 py-2 rounded-2xl bg-white/80 border border-white/50"
                  value={doctorFilter}
                  onChange={(event) => setDoctorFilter(event.target.value)}
                >
                  <option value="all">All Doctors</option>
                  {doctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
                <select
                  className="px-3 py-2 rounded-2xl bg-white/80 border border-white/50"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="waiting">Waiting</option>
                  <option value="serving">Serving</option>
                  <option value="served">Completed</option>
                </select>
                <input
                  className="px-3 py-2 rounded-2xl bg-white/80 border border-white/50"
                  placeholder="Search patient"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[760px] rounded-2xl border border-white/40 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/70 sticky top-0">
                    <tr className="text-left text-slate-500">
                      <th className="p-3">Token</th>
                      <th className="p-3">Patient</th>
                      <th className="p-3">Doctor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Position</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-6 text-center text-slate-500">
                          No patients in queue yet. Add a patient to start the queue.
                        </td>
                      </tr>
                    ) : (
                      filteredQueue.map((patient, index) => (
                        <tr
                          key={patient._id}
                          draggable
                          onDragStart={(event) => handleDragStart(event, patient._id)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleDrop(event, patient._id)}
                          className={
                            index % 2 === 0
                              ? "bg-white/70 hover:bg-white/90"
                              : "bg-white/50 hover:bg-white/90"
                          }
                        >
                          <td className="p-3 font-semibold text-clinic-700">{patient.tokenNumber}</td>
                          <td className="p-3">{patient.name}</td>
                          <td className="p-3">{patient.doctor?.name}</td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs ${getStatusBadge(patient.status)}`}>
                              {patient.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-slate-500">{index + 1}</span>
                          </td>
                          <td className="p-3 flex gap-2">
                            <button
                              onClick={handleCallNext}
                              title="Call Next"
                              className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"
                            >
                              📞
                            </button>
                            <button
                              onClick={() => handleComplete(patient._id)}
                              title="Mark Complete"
                              className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"
                            >
                              ✅
                            </button>
                            <button
                              onClick={() => handleRemove(patient._id)}
                              title="Remove"
                              className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">Drag & drop to reorder.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

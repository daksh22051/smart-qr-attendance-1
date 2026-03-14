import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { socket } from "../lib/socket";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function Analytics() {
  const [metrics, setMetrics] = useState({
    totalToday: 0,
    avgWait: 0,
    servedToday: 0,
    waiting: 0
  });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.on("analyticsUpdated", setMetrics);
    socket.on("queueUpdated", (queue) => {
      const recent = [...queue]
        .reverse()
        .slice(0, 6)
        .map((p) => ({
          token: p.tokenNumber,
          name: p.name,
          doctor: p.doctor?.name || "",
          status: p.status,
          time: new Date(p.updatedAt || p.createdAt).toLocaleTimeString()
        }));
      setActivity(recent);
    });
    return () => {
      socket.off("analyticsUpdated", setMetrics);
      socket.off("queueUpdated");
      socket.disconnect();
    };
  }, []);

  const flowData = [
    { time: "9 AM", patients: 6 },
    { time: "10 AM", patients: 10 },
    { time: "11 AM", patients: 14 },
    { time: "12 PM", patients: 9 },
    { time: "1 PM", patients: 8 },
    { time: "2 PM", patients: 12 }
  ];

  const waitingData = [
    { time: "9 AM", wait: 5 },
    { time: "10 AM", wait: 8 },
    { time: "11 AM", wait: 12 },
    { time: "12 PM", wait: 9 },
    { time: "1 PM", wait: 7 },
    { time: "2 PM", wait: 11 }
  ];

  const doctorData = [
    { name: "Dr. Ayesha Khan", patients: 18 },
    { name: "Dr. Rahul Mehta", patients: 15 },
    { name: "Dr. Zoya Ali", patients: 14 }
  ];

  const statusData = [
    { name: "Waiting", value: metrics.waiting },
    { name: "Serving", value: 1 },
    { name: "Completed", value: metrics.servedToday }
  ];

  const heatmap = [
    { label: "Morning", level: "bg-rose-300" },
    { label: "Afternoon", level: "bg-amber-300" },
    { label: "Evening", level: "bg-emerald-200" }
  ];

  const kpis = useMemo(
    () => [
      { label: "Total Patients Today", value: metrics.totalToday, trend: "+6%", icon: "👥" },
      { label: "Average Waiting Time", value: `${metrics.avgWait} min`, trend: "+2%", icon: "⏱️" },
      { label: "Patients Served", value: metrics.servedToday, trend: "+4%", icon: "✅" },
      { label: "Current Queue Length", value: metrics.waiting, trend: "-3%", icon: "🧾" }
    ],
    [metrics]
  );

  const exportCsv = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Patients Today", metrics.totalToday],
      ["Average Waiting Time", metrics.avgWait],
      ["Patients Served", metrics.servedToday],
      ["Queue Length", metrics.waiting]
    ];
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "clinic-analytics.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPdf = () => {
    const content = `Clinic Analytics\nTotal Patients: ${metrics.totalToday}\nAvg Wait: ${metrics.avgWait} min\nServed: ${metrics.servedToday}\nQueue: ${metrics.waiting}`;
    const blob = new Blob([content], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "clinic-analytics.pdf";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-clinic-700">Analytics Dashboard</h2>
          <p className="text-sm text-slate-500">Clinic insights and operational trends</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-gradient px-5 py-2">
            Export CSV
          </button>
          <button onClick={exportPdf} className="btn-gradient px-5 py-2">
            Export PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <motion.div key={card.label} className="glass-card p-6" whileHover={{ y: -3 }}>
            <div className="text-xs text-slate-500 uppercase flex items-center gap-2">
              <span>{card.icon}</span>
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-700">{card.value}</div>
            <div className="text-xs text-emerald-600">↑ {card.trend}</div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-clinic-700">Patient Flow Today</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="patients" stroke="#4f46e5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-clinic-700">Waiting Time by Hour</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waitingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="wait" fill="#14b8a6" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-clinic-700">Doctor Performance</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={doctorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={110} />
                <Tooltip />
                <Bar dataKey="patients" fill="#6366f1" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-clinic-700">Queue Heatmap</h3>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {heatmap.map((slot) => (
              <div key={slot.label} className="text-xs text-slate-500">
                <div className={`h-20 rounded-2xl ${slot.level} shadow-inner`} />
                <div className="mt-2 text-center">{slot.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-clinic-700">Status Breakdown</h3>
          <div className="mt-4 h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={50} outerRadius={90}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#f59e0b", "#3b82f6", "#10b981"][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 glass-card p-6">
        <h3 className="text-lg font-semibold text-clinic-700">Recent Activity</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Token</th>
                <th className="pb-2">Patient</th>
                <th className="pb-2">Doctor</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((row) => (
                <tr key={`${row.token}-${row.time}`} className="border-t border-white/60">
                  <td className="py-2 font-semibold text-clinic-700">{row.token}</td>
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">{row.doctor}</td>
                  <td className="py-2 capitalize">{row.status}</td>
                  <td className="py-2">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

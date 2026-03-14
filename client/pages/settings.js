import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { fetchDoctors } from "../lib/api";

export default function Settings() {
  const [tab, setTab] = useState("clinic");
  const [settings, setSettings] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // doctor form state
  const [docForm, setDocForm] = useState({ name: "", specialization: "", avgConsultationTime: 4 });
  const [docAction, setDocAction] = useState("add");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {}
    };
    load();
    fetchDoctors().then(setDoctors).catch(() => {});
  }, []);

  const handleSubmitSettings = async (e) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setMessage("Settings updated.");
      }
    } catch (err) {}
    setLoading(false);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: docAction, doctor: docForm })
      });
      if (res.ok) {
        const updated = await res.json();
        // refresh list
        const docs = await fetchDoctors();
        setDoctors(docs);
        setMessage("Doctor saved");
        setDocForm({ name: "", specialization: "", avgConsultationTime: 4 });
        setDocAction("add");
      }
    } catch (err) {}
  };

  const loadForEdit = (doc) => {
    setDocForm({
      _id: doc._id,
      name: doc.name,
      specialization: doc.specialization,
      avgConsultationTime: doc.avgConsultationTime || 4
    });
    setDocAction("edit");
    setTab("doctors");
  };

  const handleRemoveDoc = async (id) => {
    if (!confirm("Remove this doctor?")) return;
    try {
      const res = await fetch("/api/settings/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", doctor: { _id: id } })
      });
      if (res.ok) {
        setDoctors(await fetchDoctors());
        setMessage("Doctor removed");
      }
    } catch (err) {}
  };

  if (!settings) return <Layout>Loading...</Layout>;

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        {message && <div className="mb-4 text-green-600">{message}</div>}
        <div className="flex space-x-4 mb-6">
          <button
            className={`px-3 py-2 rounded ${tab === "clinic" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("clinic")}
          >
            Clinic Profile
          </button>
          <button
            className={`px-3 py-2 rounded ${tab === "doctors" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("doctors")}
          >
            Doctor Management
          </button>
          <button
            className={`px-3 py-2 rounded ${tab === "queue" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("queue")}
          >
            Queue Configuration
          </button>
          <button
            className={`px-3 py-2 rounded ${tab === "notifications" ? "bg-indigo-600 text-white" : "bg-gray-200"}`}
            onClick={() => setTab("notifications")}
          >
            Notifications
          </button>
        </div>

        <form onSubmit={handleSubmitSettings}>
          {tab === "clinic" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium">Clinic Name</label>
                <input
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={settings.clinicName}
                  onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <input
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Operating Hours</label>
                <input
                  className="mt-1 block w-full border rounded px-3 py-2"
                  value={settings.operatingHours}
                  onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                />
              </div>
            </div>
          )}

          {tab === "doctors" && (
            <div className="space-y-6">
              <div className="max-w-xl">
                <h3 className="text-lg font-semibold">Doctor List</h3>
                <ul className="mt-2 space-y-2">
                  {doctors.map((d) => (
                    <li key={d._id} className="flex justify-between items-center">
                      <span>{d.name} ({d.specialization}) - {d.avgConsultationTime || 4} min</span>
                      <span className="space-x-2">
                        <button type="button" className="text-blue-600" onClick={() => loadForEdit(d)}>Edit</button>
                        <button type="button" className="text-red-600" onClick={() => handleRemoveDoc(d._id)}>Remove</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="max-w-xl">
                <h3 className="text-lg font-semibold">{docAction === "add" ? "Add" : "Edit"} Doctor</h3>
                <form onSubmit={handleDocSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm">Name</label>
                    <input
                      className="mt-1 block w-full border rounded px-3 py-2"
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm">Specialization</label>
                    <input
                      className="mt-1 block w-full border rounded px-3 py-2"
                      value={docForm.specialization}
                      onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm">Avg consultation (min)</label>
                    <input
                      type="number"
                      min="1"
                      className="mt-1 block w-24 border rounded px-3 py-2"
                      value={docForm.avgConsultationTime}
                      onChange={(e) => setDocForm({ ...docForm, avgConsultationTime: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <button className="btn-gradient px-4 py-2">Save Doctor</button>
                </form>
              </div>
            </div>
          )}

          {tab === "queue" && (
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoQueueOptimization}
                  onChange={(e) => setSettings({ ...settings, autoQueueOptimization: e.target.checked })}
                />
                <label>Enable Auto-Queue Optimization</label>
              </div>
              <div>
                <label className="block text-sm">Token prefix (general)</label>
                <input
                  className="mt-1 block w-36 border rounded px-3 py-2"
                  value={settings.tokenPrefixes.general}
                  onChange={(e) => setSettings({ ...settings, tokenPrefixes: { ...settings.tokenPrefixes, general: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-sm">Token prefix (emergency)</label>
                <input
                  className="mt-1 block w-36 border rounded px-3 py-2"
                  value={settings.tokenPrefixes.emergency}
                  onChange={(e) => setSettings({ ...settings, tokenPrefixes: { ...settings.tokenPrefixes, emergency: e.target.value } })}
                />
              </div>
              <div>
                <label className="block text-sm">Max queue per doctor / day</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-36 border rounded px-3 py-2"
                  value={settings.maxQueueCapacityPerDoctor}
                  onChange={(e) => setSettings({ ...settings, maxQueueCapacityPerDoctor: Number(e.target.value) })}
                />
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notificationPrefs.whatsapp}
                  onChange={(e) => setSettings({ ...settings, notificationPrefs: { ...settings.notificationPrefs, whatsapp: e.target.checked } })}
                />
                <label>WhatsApp alerts</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.notificationPrefs.sms}
                  onChange={(e) => setSettings({ ...settings, notificationPrefs: { ...settings.notificationPrefs, sms: e.target.checked } })}
                />
                <label>SMS alerts</label>
              </div>
              <div>
                <label className="block text-sm">Notify when this many ahead</label>
                <input
                  type="number"
                  min="0"
                  className="mt-1 block w-24 border rounded px-3 py-2"
                  value={settings.notificationPrefs.notifyWhenAhead}
                  onChange={(e) => setSettings({ ...settings, notificationPrefs: { ...settings.notificationPrefs, notifyWhenAhead: Number(e.target.value) } })}
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            <button disabled={loading} className="btn-gradient px-6 py-2">
              {loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

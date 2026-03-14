const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export const fetchDoctors = async () => {
  const res = await fetch(`${API_BASE}/api/doctors`);
  if (!res.ok) throw new Error("Failed to load doctors");
  return res.json();
};

export const createDoctor = async (payload) => {
  const res = await fetch(`${API_BASE}/api/doctors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to create doctor");
  return res.json();
};

export const registerPatient = async (payload) => {
  const res = await fetch(`${API_BASE}/api/patient/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
};

export const fetchQueue = async () => {
  const res = await fetch(`${API_BASE}/api/queue`);
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
};

export const fetchQueueWithServed = async () => {
  const res = await fetch(`${API_BASE}/api/queue?includeServed=true`);
  if (!res.ok) throw new Error("Failed to load queue");
  return res.json();
};

export const callNext = async () => {
  const res = await fetch(`${API_BASE}/api/queue/next`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to call next patient");
  return res.json();
};

export const removePatient = async (id) => {
  const res = await fetch(`${API_BASE}/api/patient/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove patient");
  return res.json();
};

export const updatePatientStatus = async (id, status) => {
  const res = await fetch(`${API_BASE}/api/patient/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Failed to update patient status");
  return res.json();
};

export const reorderQueue = async (order) => {
  const res = await fetch(`${API_BASE}/api/queue/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order })
  });
  if (!res.ok) throw new Error("Failed to reorder queue");
  return res.json();
};

export const fetchWaitPrediction = async (token) => {
  const res = await fetch(`${API_BASE}/api/ai/wait-time/${token}`);
  if (!res.ok) throw new Error("Failed to load wait prediction");
  return res.json();
};

export const fetchBestDoctor = async () => {
  const res = await fetch(`${API_BASE}/api/ai/best-doctor`);
  if (!res.ok) throw new Error("Failed to load best doctor");
  return res.json();
};

export const optimizeQueue = async () => {
  const res = await fetch(`${API_BASE}/api/ai/optimize-queue`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to optimize queue");
  return res.json();
};

export const fetchAiAlerts = async () => {
  const res = await fetch(`${API_BASE}/api/ai/alerts`);
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
};

export const fetchAiInsights = async () => {
  const res = await fetch(`${API_BASE}/api/ai/analytics-insights`);
  if (!res.ok) throw new Error("Failed to load AI insights");
  return res.json();
};

export const fetchDashboardAnalytics = async () => {
  const res = await fetch(`${API_BASE}/api/dashboard/analytics`);
  if (!res.ok) throw new Error("Failed to load dashboard analytics");
  return res.json();
};

// settings
export const fetchSettings = async () => {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
};

export const updateSettings = async (payload) => {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
};

export const modifyDoctor = async (action, doctor) => {
  const res = await fetch(`${API_BASE}/api/settings/doctors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, doctor })
  });
  if (!res.ok) throw new Error("Failed to modify doctor");
  return res.json();
};

// pharmacy orders
export const placePharmacyOrder = async (payload) => {
  const res = await fetch(`${API_BASE}/api/pharmacy/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to place order");
  return res.json();
};

export const fetchPharmacyOrders = async (status, search, startDate, endDate, paymentStatus) => {
  const url = new URL(`${API_BASE}/api/pharmacy/orders`);
  if (status) url.searchParams.append("status", status);
  if (search) url.searchParams.append("search", search);
  if (startDate) url.searchParams.append("startDate", startDate);
  if (endDate) url.searchParams.append("endDate", endDate);
  if (paymentStatus) url.searchParams.append("paymentStatus", paymentStatus);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json();
};

export const updatePharmacyOrder = async (id, update) => {
  const res = await fetch(`${API_BASE}/api/pharmacy/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  });
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
};

export const updatePharmacyPayment = async (id, paymentData) => {
  const res = await fetch(`${API_BASE}/api/pharmacy/orders/${id}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(paymentData)
  });
  if (!res.ok) throw new Error("Failed to update payment");
  return res.json();
};

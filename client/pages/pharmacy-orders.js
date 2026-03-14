import { useCallback, useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { fetchPharmacyOrders, updatePharmacyOrder, updatePharmacyPayment } from "../lib/api";
import { socket } from "../lib/socket";
import { motion, AnimatePresence } from "framer-motion";

// Prescription Modal Component
function PrescriptionModal({ isOpen, imageUrl, onClose }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-800">📸 Prescription</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="prescription"
              className="w-full rounded-lg border border-slate-300 max-h-96 object-contain"
            />
          ) : (
            <p className="text-center text-gray-500 py-8">No prescription image available</p>
          )}
          <div className="mt-4 flex gap-2">
            <motion.button
              onClick={() => {
                if (imageUrl) {
                  const link = document.createElement("a");
                  link.href = imageUrl;
                  link.download = "prescription.jpg";
                  link.click();
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              📥 Download
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Close
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Payment Modal Component
function PaymentModal({ isOpen, order, onClose, onPaymentUpdate }) {
  const [paymentStatus, setPaymentStatus] = useState(order?.paymentStatus || "Pending");
  const [paymentMethod, setPaymentMethod] = useState(order?.paymentMethod || "Cash");
  const [paidAmount, setPaidAmount] = useState(order?.paidAmount || order?.totalAmount || 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-2xl font-bold text-slate-800 mb-4">💳 Update Payment</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="Pending">⏳ Pending</option>
                <option value="Paid - UPI">💳 Paid - UPI</option>
                <option value="Paid - Cash">💵 Paid - Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="Cash">💵 Cash</option>
                <option value="UPI">📱 UPI</option>
                <option value="Card">💳 Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Amount Paid</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-600 mt-1">Total: ₹{order?.totalAmount}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <motion.button
              onClick={() =>
                onPaymentUpdate({
                  paymentStatus,
                  paymentMethod,
                  paidAmount
                })
              }
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              💾 Save
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function PharmacyOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateNotification, setUpdateNotification] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const printRef = useRef();

  // Wrap load in useCallback so it has stable identity
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPharmacyOrders(statusFilter, searchTerm, startDate, endDate, paymentFilter);
      setOrders(data || []);
    } catch (e) {
      console.error("Failed to load pharmacy orders:", e);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, startDate, endDate, paymentFilter]);

  const changeStatus = useCallback(async (id, status) => {
    try {
      await updatePharmacyOrder(id, { status });
      setUpdateNotification(`✅ Order marked as ${status}!`);
      setTimeout(() => setUpdateNotification(""), 3000);
      await load();
    } catch (e) {
      console.error("Failed to update order status:", e);
      setError("Failed to update order");
    }
  }, [load]);

  const handlePaymentUpdate = useCallback(async (orderId, paymentData) => {
    try {
      await updatePharmacyPayment(orderId, paymentData);
      setUpdateNotification(`✅ Payment updated!`);
      setTimeout(() => setUpdateNotification(""), 3000);
      setPaymentModalOrder(null);
      await load();
    } catch (e) {
      console.error("Failed to update payment:", e);
      setError("Failed to update payment");
    }
  }, [load]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Pharmacy Orders</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #4CAF50; color: white; }
              tr:nth-child(even) { background-color: #f2f2f2; }
              .header { text-align: center; margin-bottom: 30px; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>💊 Pharmacy Orders Report</h1>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrintReceipt = (order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const items = order.medicines
      .map((med) => `<tr><td>${med.name}</td><td>${med.quantity}</td><td>₹${med.price}</td></tr>`)
      .join("");
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .meta { color: #6b7280; font-size: 12px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
            .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 12px; }
            .badge { display: inline-block; padding: 4px 8px; background: #ecfdf3; color: #166534; border-radius: 9999px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>Smart Clinic Pharmacy Receipt</h1>
          <div class="meta">Patient: ${order.patient?.name || "Unknown"} • Token: ${order.patient?.tokenNumber || "N/A"}</div>
          <div class="meta">Date: ${new Date(order.createdAt).toLocaleString()} • Payment: <span class="badge">${order.paymentStatus || "Pending"}</span></div>
          <table>
            <thead>
              <tr><th>Medicine</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>
          <div class="total">Total: ₹${order.totalAmount}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleNotify = (order) => {
    const patientName = order.patient?.name || "Patient";
    const token = order.patient?.tokenNumber || "";
    const message = encodeURIComponent(
      `Hello ${patientName}, your pharmacy order${token ? ` (Token ${token})` : ""} is packed and ready for pickup. Please complete payment if pending.`
    );
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
    setUpdateNotification("✅ Notification link opened.");
    setTimeout(() => setUpdateNotification(""), 3000);
  };

  // Load orders when filters change
  useEffect(() => {
    load();
  }, [load]);

  // Socket listeners - only on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      socket.connect();
      socket.on("pharmacyOrderCreated", load);
      socket.on("pharmacyOrderUpdated", load);
    } catch (err) {
      console.error("Socket connection error:", err);
    }

    return () => {
      socket.off("pharmacyOrderCreated", load);
      socket.off("pharmacyOrderUpdated", load);
      socket.disconnect();
    };
  }, [load]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "from-amber-400 to-orange-400";
      case "Packed":
        return "from-blue-400 to-indigo-400";
      case "Delivered":
        return "from-green-400 to-emerald-400";
      default:
        return "from-gray-400 to-slate-400";
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case "Pending":
        return "from-yellow-200 to-yellow-300";
      case "Paid - UPI":
      case "Paid - Cash":
        return "from-green-200 to-green-300";
      default:
        return "from-gray-200 to-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending":
        return "⏳";
      case "Packed":
        return "📦";
      case "Delivered":
        return "✅";
      default:
        return "❓";
    }
  };

  const getPaymentIcon = (status) => {
    switch (status) {
      case "Pending":
        return "⏳";
      case "Paid - UPI":
        return "💳";
      case "Paid - Cash":
        return "💵";
      default:
        return "❓";
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "Pending").length,
    packed: orders.filter(o => o.status === "Packed").length,
    delivered: orders.filter(o => o.status === "Delivered").length,
    unpaid: orders.filter(o => o.paymentStatus === "Pending").length
  };


  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-clinic-600 to-purple-600">
              💊 Pharmacy Orders Dashboard
            </h1>
            <p className="text-slate-600 mt-2">Advanced order management & payment tracking</p>
          </div>
          <motion.button
            onClick={handlePrint}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🖨️ Print Report
          </motion.button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-5 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {[
            { label: "Total Orders", value: stats.total, icon: "📋", color: "from-blue-400 to-blue-600" },
            { label: "Pending", value: stats.pending, icon: "⏳", color: "from-amber-400 to-orange-600" },
            { label: "Packed", value: stats.packed, icon: "📦", color: "from-indigo-400 to-indigo-600" },
            { label: "Delivered", value: stats.delivered, icon: "✅", color: "from-green-400 to-green-600" },
            { label: "Unpaid", value: stats.unpaid, icon: "💳", color: "from-red-400 to-pink-600" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg cursor-pointer`}
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-sm text-white/80">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Advanced Filters */}
        <motion.div
          className="bg-white/70 backdrop-blur border border-white/50 rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-bold text-slate-800">🔍 Search & Filter</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Name / Token</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-clinic-500 transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-clinic-500 cursor-pointer"
              >
                <option value="">🔍 All Orders</option>
                <option value="Pending">⏳ Pending</option>
                <option value="Packed">📦 Packed</option>
                <option value="Delivered">✅ Delivered</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-clinic-500 cursor-pointer"
              >
                <option value="">💳 All Payments</option>
                <option value="Pending">⏳ Unpaid</option>
                <option value="Paid - UPI">💳 Paid - UPI</option>
                <option value="Paid - Cash">💵 Paid - Cash</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="md:col-span-2 lg:col-span-1 flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-clinic-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-clinic-500"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter || paymentFilter || startDate || endDate) && (
            <motion.button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setPaymentFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="px-4 py-2 text-sm bg-gray-300 text-gray-800 rounded-lg font-semibold"
              whileHover={{ scale: 1.05 }}
            >
              ✕ Clear All Filters
            </motion.button>
          )}
        </motion.div>

        {/* Notifications */}
        <AnimatePresence>
          {updateNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded text-center font-semibold"
            >
              {updateNotification}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded text-center font-semibold"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {loading ? (
          <motion.div
            className="text-center py-12"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-slate-600 font-semibold">Loading orders...</p>
          </motion.div>
        ) : (
          <>
            {/* Print Table (hidden, for print functionality) */}
            <div className="hidden">
              <table ref={printRef} style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Medicines</th>
                    <th>Amount</th>
                    <th>Order Status</th>
                    <th>Payment Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.patient?.name} ({order.patient?.tokenNumber})</td>
                      <td>{order.medicines.map(m => `${m.name} x${m.quantity}`).join(", ")}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>{order.status}</td>
                      <td>{order.paymentStatus}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Orders Grid */}
            <motion.div
              className="grid gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.05 }}
            >
              <AnimatePresence>
                {orders.length > 0 ? (
                  orders.map((order, idx) => (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.02 }}
                      className="bg-white/80 backdrop-blur border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                      whileHover={{ y: -3 }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Left: Patient & Medicines */}
                        <div className="lg:col-span-2">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-3xl">👤</div>
                            <div>
                              <h3 className="font-bold text-lg text-slate-800">
                                {order.patient?.name || "Unknown Patient"}
                              </h3>
                              <p className="text-sm text-slate-500">
                                Token: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{order.patient?.tokenNumber || "N/A"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-semibold text-slate-600 mb-2">📦 Medicines:</p>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {order.medicines.map((med, i) => (
                                <div key={i} className="text-sm text-slate-700">
                                  <span className="font-medium">{med.name}</span> × {med.quantity} @ ₹{med.price}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 flex gap-2 text-xs text-slate-600 flex-wrap">
                            <div>📅 {new Date(order.createdAt).toLocaleDateString()}</div>
                            <div>🕒 {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>

                        {/* Middle: Statuses */}
                        <div className="space-y-3">
                          {/* Order Status */}
                          <motion.div
                            className={`px-3 py-2 rounded-xl bg-gradient-to-r ${getStatusColor(order.status)} text-white font-bold text-sm shadow-md`}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {getStatusIcon(order.status)} {order.status}
                          </motion.div>

                          {/* Payment Status */}
                          <motion.div
                            className={`px-3 py-2 rounded-xl bg-gradient-to-r ${getPaymentColor(order.paymentStatus)} text-slate-800 font-bold text-sm shadow-md`}
                          >
                            {getPaymentIcon(order.paymentStatus)} {order.paymentStatus}
                          </motion.div>

                          {/* Amount */}
                          <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-xl">
                            <p className="text-xs text-orange-600 font-semibold">Total</p>
                            <p className="text-2xl font-bold text-orange-700">₹{order.totalAmount}</p>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="space-y-2 flex flex-col">
                          {/* Status Action */}
                          {order.status !== "Delivered" && (
                            <motion.button
                              onClick={() => changeStatus(order._id, order.status === "Pending" ? "Packed" : "Delivered")}
                              className={`py-2 rounded-lg font-semibold text-white text-sm ${
                                order.status === "Pending"
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                                  : "bg-gradient-to-r from-green-500 to-emerald-600"
                              }`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              {order.status === "Pending" ? "📦 Pack" : "✅ Deliver"}
                            </motion.button>
                          )}

                          {/* Payment Action */}
                          <motion.button
                            onClick={() => setPaymentModalOrder(order)}
                            className="py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-purple-500 to-pink-600"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            💳 Payment
                          </motion.button>

                          {/* Prescription */}
                          {(order.prescriptionUrl || order.prescriptionImage) && (
                            <motion.button
                              onClick={() => setSelectedPrescription(order.prescriptionUrl || order.prescriptionImage)}
                              className="py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-indigo-500 to-blue-600"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              📸 View Rx
                            </motion.button>
                          )}

                          {/* Notify */}
                          <motion.button
                            onClick={() => handleNotify(order)}
                            className="py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-teal-500 to-cyan-600"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            📱 Notify
                          </motion.button>

                          <motion.button
                            onClick={() => handlePrintReceipt(order)}
                            className="py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-slate-500 to-slate-700"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            🧾 Print Receipt
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    className="text-center py-12 text-slate-500"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="text-5xl mb-3">📭</div>
                    <p className="text-lg font-semibold">No orders found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or check back later</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}

        {/* Modals */}
        <PrescriptionModal
          isOpen={!!selectedPrescription}
          imageUrl={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
        />
        <PaymentModal
          isOpen={!!paymentModalOrder}
          order={paymentModalOrder}
          onClose={() => setPaymentModalOrder(null)}
          onPaymentUpdate={(paymentData) =>
            handlePaymentUpdate(paymentModalOrder._id, paymentData)
          }
        />
      </div>
    </Layout>
  );
}

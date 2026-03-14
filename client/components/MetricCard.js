import { motion } from "framer-motion";

export default function MetricCard({ label, value, accent }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card p-5"
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${accent || "text-clinic-700"}`}>
        {value}
      </div>
    </motion.div>
  );
}

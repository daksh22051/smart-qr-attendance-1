import { useEffect, useMemo, useState } from "react";
import { socket } from "../lib/socket";
import { motion } from "framer-motion";

export default function Display() {
  const [queue, setQueue] = useState([]);
  const [now, setNow] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [lastToken, setLastToken] = useState(null);

  useEffect(() => {
    socket.connect();
    socket.on("queueUpdated", setQueue);
    return () => {
      socket.off("queueUpdated", setQueue);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const current = useMemo(() => queue.find((p) => p.status === "serving"), [queue]);
  const waiting = useMemo(() => queue.filter((p) => p.status === "waiting"), [queue]);
  const nextTokens = waiting.slice(0, 4).map((p) => p.tokenNumber);
  const remaining = waiting.length;

  useEffect(() => {
    if (!current?.tokenNumber) return;
    if (lastToken && lastToken !== current.tokenNumber) {
      const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=");
      audio.play().catch(() => null);
      const doctorName = current?.doctor?.name || "your doctor";
      const message = `Token ${current.tokenNumber} please proceed to ${doctorName}`;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
      }
    }
    setLastToken(current.tokenNumber || null);
  }, [current?.tokenNumber, lastToken]);

  const announceToken = () => {
    if (!current?.tokenNumber) return;
    const doctorName = current?.doctor?.name || "your doctor";
    const message = `Token ${current.tokenNumber} please proceed to ${doctorName}`;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dbeafe] via-[#e0f2fe] to-[#f0fdfa] text-slate-900">
      <div className="relative min-h-screen px-10 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_45%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-blue-50/90 border-t border-blue-100">
          <div className="h-full flex items-center overflow-hidden">
            <motion.div
              className="whitespace-nowrap text-lg font-semibold px-8 text-slate-700"
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              Welcome to Smart Clinic. Please wait for your token to be called.
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 grid gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-semibold text-slate-900">Smart Clinic Queue</h1>
                <p className="text-slate-600 text-lg">Waiting Room Display</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={announceToken}
                  className="px-4 py-2 rounded-full bg-white shadow border border-blue-100 text-sm font-semibold text-blue-700"
                >
                  🔊 Announce Token
                </button>
                <div className="text-3xl font-semibold text-slate-800" suppressHydrationWarning>
                  🕒 {mounted ? now.toLocaleTimeString() : "--:--"}
                </div>
              </div>
            </div>

          <div className="grid gap-8 lg:grid-cols-[1.5fr_0.5fr]">
            <div className="bg-white rounded-[32px] shadow-xl border border-blue-100 p-12 text-center">
              <div className="text-2xl uppercase tracking-widest text-slate-500">Now Serving</div>
              <motion.div
                className="text-[120px] font-bold mt-4 text-emerald-500"
                animate={{ textShadow: ["0 0 12px rgba(16,185,129,0.35)", "0 0 30px rgba(16,185,129,0.6)"] }}
                transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse" }}
              >
                {current ? current.tokenNumber : "--"}
              </motion.div>
              <div className="mt-4 text-xl text-slate-600">Doctor</div>
              <div className="text-3xl font-semibold flex items-center justify-center gap-3 text-slate-800">
                <span>🩺</span>
                {current?.doctor?.name || "Dr. Ayesha Khan"}
              </div>
            </div>

            <div className="grid gap-8">
              <div className="bg-white rounded-[28px] shadow-lg border border-blue-100 p-6">
                <div className="text-sm uppercase text-slate-500">Patients Waiting</div>
                <div className="text-5xl font-semibold mt-2 text-slate-900">{remaining}</div>
              </div>
              <div className="bg-white rounded-[28px] shadow-lg border border-blue-100 p-6">
                <div className="text-sm uppercase text-slate-500">Queue Progress</div>
                <div className="mt-2 text-sm text-slate-600">
                  Now Serving → {current?.tokenNumber || "--"} | Next → {nextTokens[0] || "--"} | Remaining → {remaining}
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-blue-100 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 via-blue-500 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, 20 + remaining * 8)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[28px] shadow-xl border border-blue-100 p-8">
            <div className="text-xl uppercase tracking-widest text-slate-500">Next Tokens</div>
            <div className="mt-4 flex flex-wrap gap-4">
              {nextTokens.length ? (
                nextTokens.map((token, index) => (
                  <motion.span
                    key={token}
                    className={`px-6 py-3 rounded-full text-2xl font-semibold shadow ${
                      index === 0 ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-700"
                    }`}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  >
                    {token}
                  </motion.span>
                ))
              ) : (
                <div className="text-2xl text-slate-500">--</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

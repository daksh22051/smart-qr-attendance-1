"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Spline from "@splinetool/react-spline";
import { useRouter } from "next/navigation";

const roleThemes = {
  Receptionist: {
    accent: "from-sky-400 to-blue-500",
    pill: "bg-sky-100 text-sky-700",
    highlight: "bg-sky-50"
  },
  Doctor: {
    accent: "from-emerald-400 to-teal-500",
    pill: "bg-emerald-100 text-emerald-700",
    highlight: "bg-emerald-50"
  },
  Admin: {
    accent: "from-purple-400 to-indigo-500",
    pill: "bg-purple-100 text-purple-700",
    highlight: "bg-purple-50"
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("Receptionist");
  const [authMode, setAuthMode] = useState("password");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const theme = useMemo(() => roleThemes[role], [role]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setSuccess(true);
      setTimeout(() => {
        setIsSubmitting(false);
        router.push("/");
      }, 700);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-3xl bg-white border border-slate-100 p-8 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-800">Smart Clinic Login</h1>
                <p className="mt-2 text-slate-500">Sign in to continue with your role.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${theme.pill}`}>
                {role}
              </span>
            </div>

            <div className="mt-6 rounded-full bg-slate-50 p-2 border border-slate-100 relative">
              <motion.div
                layout
                className={`absolute top-2 bottom-2 rounded-full bg-white shadow-sm ${
                  role === "Receptionist" ? "left-2 right-2/3" : role === "Doctor" ? "left-1/3 right-1/3" : "left-2/3 right-2"
                }`}
              />
              <div className="relative grid grid-cols-3 text-sm font-medium text-slate-600">
                {["Receptionist", "Doctor", "Admin"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className="z-10 py-2"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("password")}
                className={`flex-1 rounded-2xl border px-4 py-2 text-sm ${
                  authMode === "password" ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-500"
                }`}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("otp")}
                className={`flex-1 rounded-2xl border px-4 py-2 text-sm ${
                  authMode === "otp" ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 text-slate-500"
                }`}
              >
                Login via Mobile OTP
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {authMode === "password" ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email / Username</label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder="you@clinic.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Password</label>
                    <div className="relative mt-2">
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm focus:border-clinic-400 focus:outline-none"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
                        title="Toggle password"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Mobile Number</label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                      value={mobile}
                      onChange={(event) => setMobile(event.target.value)}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">OTP</label>
                    <input
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-clinic-400 focus:outline-none"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                      placeholder="Enter OTP"
                      required
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full rounded-2xl bg-gradient-to-r ${theme.accent} px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60`}
              >
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.span
                      key="success"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <span className="h-5 w-5 rounded-full bg-white/90 text-emerald-600 flex items-center justify-center">✓</span>
                      Success
                    </motion.span>
                  ) : isSubmitting ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-2"
                    >
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      Sign In
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <p className="text-xs text-slate-400">
                By continuing, you agree to the clinic access policy.
              </p>
            </form>
          </motion.div>

          <div className="rounded-3xl bg-gradient-to-br from-blue-50 via-white to-rose-50 border border-slate-100 p-6 flex items-center justify-center">
            <div className="w-full h-[420px] rounded-3xl overflow-hidden">
              <Spline scene="https://prod.spline.design/2w6k1yBN0NQ7QmS0/scene.splinecode" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

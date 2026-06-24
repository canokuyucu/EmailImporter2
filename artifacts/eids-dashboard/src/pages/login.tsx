import * as React from "react";
import { Shield, Eye, EyeOff, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoginProps {
  onSuccess: () => void;
}

export default function Login({ onSuccess }: LoginProps) {
  const [pin, setPin] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [attempts, setAttempts] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();

      if (data.ok) {
        localStorage.setItem("eids_auth_token", data.token);
        onSuccess();
      } else {
        setAttempts((a) => a + 1);
        setError(data.error || "Yanlış PIN. Tekrar deneyin.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch {
      setError("Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-primary to-blue-700 flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-blue-700 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 rounded-2xl border border-white/20 mb-4 shadow-xl">
              <Shield className="w-10 h-10 text-white drop-shadow" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">EIDS Yetki Takip</h1>
            <p className="text-blue-200 text-sm mt-1">T.C. Ticaret Bakanlığı</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <p className="font-semibold text-foreground">PIN ile giriş yapın</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type={show ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN kodunuzu girin"
                  className={cn(
                    "w-full px-4 py-4 text-lg font-mono tracking-widest border-2 rounded-xl bg-slate-50 dark:bg-slate-800 outline-none transition-all",
                    error
                      ? "border-rose-400 focus:border-rose-500 bg-rose-50 dark:bg-rose-900/20"
                      : "border-slate-200 dark:border-slate-700 focus:border-primary"
                  )}
                  autoComplete="current-password"
                  maxLength={12}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-medium bg-rose-50 dark:bg-rose-900/20 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-800"
                >
                  <span>⚠️</span> {error}
                  {attempts >= 3 && <span className="ml-auto text-xs opacity-70">({attempts} deneme)</span>}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={!pin || loading}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200",
                  !pin || loading
                    ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                    : "bg-gradient-to-r from-primary to-blue-700 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Kontrol ediliyor...
                  </span>
                ) : "Giriş Yap →"}
              </button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              PIN bilmiyorsanız sistem yöneticisine başvurun.
            </p>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">v3.0.0-pro • EIDS Yetki Takip Sistemi</p>
      </motion.div>
    </div>
  );
}

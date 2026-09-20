import React, { useState } from 'react';
import { Lock, User, ArrowRight, Shield, Award, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import A380Icon from '../components/A380Icon';

/**
 * Halton 2D quasi-random low-discrepancy sequence.
 * Guarantees a natural, uniform celestial starfield distribution across the entire canvas
 * without forming any lines, diagonals, or grid artifacts.
 */
function halton(index, base) {
  let result = 0;
  let f = 1 / base;
  let i = index;
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f = f / base;
  }
  return result;
}

const STARS = Array.from({ length: 150 }, (_, i) => {
  const left = (halton(i + 1, 2) * 98.5 + 0.8).toFixed(2);
  const top = (halton(i + 1, 3) * 98.5 + 0.8).toFixed(2);
  const isLarge = i % 14 === 0;
  const isMedium = i % 4 === 0;
  const size = isLarge ? 3.5 : (isMedium ? 2.2 : 1.2);
  const isCyan = i % 7 === 0;
  const isViolet = i % 11 === 0;
  
  return {
    id: i,
    top: `${top}%`,
    left: `${left}%`,
    size,
    isLarge,
    color: isCyan ? '#7dd3fc' : (isViolet ? '#c084fc' : '#ffffff'),
    twinkleDuration: `${1.8 + (i % 7) * 0.6}s`,
    driftDuration: `${8 + (i % 6) * 1.8}s`,
    delay: `${(i % 13) * 0.35}s`,
    opacity: isLarge ? 0.95 : (0.35 + (i % 6) * 0.1).toFixed(2)
  };
});

const METEORS = [
  { id: 1, top: '15%', left: '85%', delay: '2s', duration: '7.5s' },
  { id: 2, top: '42%', left: '72%', delay: '6s', duration: '8.5s' },
  { id: 3, top: '10%', left: '40%', delay: '10s', duration: '9.5s' },
];

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animate-space-bg flex flex-col justify-between relative overflow-hidden text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* UNIFIED FULL-VIEWPORT SPACE FIELD: Single Seamless Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {STARS.map((star) => (
          <div
            key={star.id}
            className="star-particle"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              opacity: star.opacity,
              boxShadow: star.isLarge ? `0 0 10px 2px ${star.color}` : 'none',
              animation: `starTwinkle ${star.twinkleDuration} ease-in-out infinite ${star.delay}, starDrift ${star.driftDuration} ease-in-out infinite ${star.delay}`,
            }}
          />
        ))}

        {METEORS.map((m) => (
          <div
            key={m.id}
            className="meteor-streak"
            style={{
              top: m.top,
              left: m.left,
              animation: `shootingStarAnim ${m.duration} ease-in infinite ${m.delay}`,
            }}
          />
        ))}

        {/* Ambient cosmic stardust */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Centered Enterprise Hero Layout: Harmonious balance between Left Showcase and Right Sign-In */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10 w-full">
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 xl:gap-24 py-6">
          
          {/* LEFT SIDE: Brand Showcase with 3D Rotating A380 Emblem and Enlarged Typography */}
          <div className="flex-1 w-full max-w-2xl xl:max-w-3xl space-y-6 lg:space-y-7">
            {/* Hero 3D Emblem and Branding with A380 Logo */}
            <div>
              <div className="flex items-center gap-6 sm:gap-7 mb-4">
                {/* 3D Continuously Rotating & Glowing Airbus A380 Emblem */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-600 p-0.5 shadow-2xl animate-rotate-3d-glow">
                    <div className="w-full h-full bg-slate-950/85 rounded-[22px] backdrop-blur-md flex items-center justify-center border border-blue-400/50 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-transparent to-white/30 pointer-events-none" />
                      <A380Icon className="w-16 h-16 sm:w-18 sm:h-18 transform -rotate-12 drop-shadow-[0_0_18px_rgba(56,189,248,0.95)]" />
                    </div>
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-blue-500/40 blur-lg rounded-full" />
                </div>

                <div>
                  <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white drop-shadow-lg leading-none">
                    UUDS <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">AERO</span>
                  </h1>
                  <p className="text-sm sm:text-base xl:text-lg font-bold text-blue-400/90 tracking-wide mt-2">
                    Training Compliance & Manpower Tracker
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base xl:text-lg text-slate-200 leading-relaxed mt-4 font-normal">
                Enterprise aviation compliance system providing end-to-end monitoring of mandatory qualifications, recurrent safety training, automated expiry alerts, and direct staff communication.
              </p>
            </div>

            {/* Key Aviation Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/65 backdrop-blur-md border border-slate-700/70 hover:border-blue-400/50 shadow-lg transition flex items-start gap-3.5">
                <div className="p-2.5 sm:p-3 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Regulatory Audit Readiness</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">Full compliance auditing across Technical, Line & Base Maintenance.</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/65 backdrop-blur-md border border-slate-700/70 hover:border-amber-400/50 shadow-lg transition flex items-start gap-3.5">
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-600/20 text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Early Expiry Tracking</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">Proactive 30-day notifications and overdue alerts for continuous readiness.</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/65 backdrop-blur-md border border-slate-700/70 hover:border-emerald-400/50 shadow-lg transition flex items-start gap-3.5">
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-600/20 text-emerald-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Staff Training Profiles</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">Complete individual matrix with instantaneous certificate date updating.</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/65 backdrop-blur-md border border-slate-700/70 hover:border-indigo-400/50 shadow-lg transition flex items-start gap-3.5">
                <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white">Direct WhatsApp & Email</h4>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">One-click reminder dispatch with custom templates for department managers.</p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-xs sm:text-sm text-slate-400 flex items-center gap-2.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-glow-blue" />
              <span>UUDS Aero (DXB) • Aviation Compliance Portal</span>
            </div>
          </div>

          {/* RIGHT SIDE: Dedicated Sign-In Card */}
          <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0">
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/75 backdrop-blur-2xl border border-blue-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_35px_rgba(59,130,246,0.18)] relative overflow-hidden transition-all hover:border-blue-400/40">
              {/* Subtle top card glow highlight */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70" />

              {/* Form Header */}
              <div className="mb-7">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Account Sign In
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  Enter your authorized credentials to access compliance records
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-2xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 animate-scale-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-900/50 border border-blue-400/40 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating System...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-7 pt-5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Dubai International Airport (DXB)</span>
                <span className="font-mono text-blue-400/90 font-semibold">v2.4 Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Developer Footer */}
      <footer className="w-full py-3.5 px-4 text-center text-xs font-semibold tracking-wider text-slate-300 border-t border-slate-800/60 bg-slate-950/70 backdrop-blur-md z-10 shrink-0 shadow-lg">
        *** Designed and developed by | Khurram Munir Basra | UUDS DXB Stores ***
      </footer>
    </div>
  );
}

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

const STARS = Array.from({ length: 160 }, (_, i) => {
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
  { id: 1, top: '12%', left: '88%', delay: '2s', duration: '7.5s' },
  { id: 2, top: '38%', left: '68%', delay: '6s', duration: '8.5s' },
  { id: 3, top: '9%', left: '45%', delay: '10s', duration: '9.5s' },
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Main Two-Column Layout: Text to the LEFT, Login Box shifted to the RIGHT */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full justify-between items-stretch">
        {/* LEFT SIDE: Original Brand Showcase Text with 3D Rotating A380 Emblem */}
        <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 lg:p-16 z-10 max-w-2xl">
          <div>
            {/* Top Brand Tag */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wider uppercase mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>GCAA CAR 145 & EASA Part 145 Verified</span>
            </div>

            {/* Hero 3D Emblem and Branding with A380 Logo */}
            <div className="mt-4 sm:mt-8 max-w-xl">
              <div className="flex items-center gap-6 mb-6">
                {/* 3D Continuously Rotating & Glowing Airbus A380 Emblem */}
                <div className="relative group shrink-0">
                  <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-3xl bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-600 p-0.5 shadow-2xl animate-rotate-3d-glow">
                    <div className="w-full h-full bg-slate-950/85 rounded-[22px] backdrop-blur-md flex items-center justify-center border border-blue-400/50 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 via-transparent to-white/30 pointer-events-none" />
                      <A380Icon className="w-14 h-14 sm:w-16 sm:h-16 transform -rotate-12 drop-shadow-[0_0_16px_rgba(56,189,248,0.95)]" />
                    </div>
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-3 bg-blue-500/40 blur-lg rounded-full" />
                </div>

                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    UUDS <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">AERO</span>
                  </h1>
                  <p className="text-sm font-semibold text-blue-400/90 tracking-wide mt-0.5">
                    Training Compliance & Manpower Tracker
                  </p>
                </div>
              </div>

              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mt-4">
                Enterprise aviation compliance system providing end-to-end monitoring of mandatory qualifications, recurrent safety training, automated expiry alerts, and direct staff communication.
              </p>
            </div>

            {/* Key Aviation Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 sm:mt-12 max-w-xl">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3 hover:border-blue-500/40 transition">
                <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Regulatory Audit Readiness</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Full compliance auditing across Technical, Line & Base Maintenance.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3 hover:border-blue-500/40 transition">
                <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Early Expiry Tracking</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Proactive 30-day notifications and overdue alerts for continuous readiness.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3 hover:border-blue-500/40 transition">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Staff Training Profiles</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Complete individual matrix with instantaneous certificate date updating.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3 hover:border-blue-500/40 transition">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Direct WhatsApp & Email</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">One-click reminder dispatch with custom templates for department managers.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-xs text-slate-500">
            UUDS Aero (DXB) • Aviation Compliance Portal
          </div>
        </div>

        {/* RIGHT SIDE: Dedicated Sign-In Card (firmly shifted to the right) */}
        <div className="w-full lg:w-[480px] xl:w-[540px] flex items-center justify-center lg:justify-end p-6 sm:p-12 lg:p-16 z-10">
          <div className="w-full max-w-md">
            <div className="glass-panel-glow p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl relative">
              {/* Form Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Account Sign In
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your authorized credentials to access compliance records
                </p>
              </div>

              {error && (
                <div className="mb-6 p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-3 animate-scale-in">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
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
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition shadow-inner"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3.5 px-5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-900/40 border border-blue-400/40 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating System...' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Dubai International Airport (DXB)</span>
                <span className="font-mono text-blue-400/80">v2.4 Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Developer Footer */}
      <footer className="w-full py-4 px-4 text-center text-xs sm:text-sm font-semibold tracking-wider text-slate-300 border-t border-slate-800/60 bg-slate-950/60 backdrop-blur-md z-10 shadow-lg">
        *** Designed and developed by | Khurram Munir Basra | UUDS DXB Stores ***
      </footer>
    </div>
  );
}

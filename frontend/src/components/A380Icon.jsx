import React from 'react';

/**
 * Authentic Airbus A380 vector icon:
 * Features the signature double-deck fuselage, 4 high-bypass turbofan engines,
 * swept wings with wingtip fences, and dual-deck cockpit windows.
 */
export default function A380Icon({ className = "w-12 h-12 text-blue-400" }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Airbus A380"
    >
      <defs>
        {/* Fuselage & Wing Aerospace Gradient */}
        <linearGradient id="a380Body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="45%" stopColor="#3b82f6" />
          <stop offset="85%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        {/* Engine Nacelle Glow */}
        <linearGradient id="a380Engine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>

        {/* Wing Highlights */}
        <linearGradient id="a380WingEdge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Main Swept Wings with A380 Wingtip Fences */}
      {/* Left Wing */}
      <path
        d="M 54 44 
           L 10 70 
           L 9 66 
           L 9 74 
           L 11 74 
           L 54 58 
           Z"
        fill="url(#a380Body)"
        opacity="0.95"
      />
      {/* Left Wingtip Fence (Vertical fin extending up & down at tip) */}
      <polygon points="8,64 11,64 10,75 7,75" fill="#38bdf8" />

      {/* Right Wing */}
      <path
        d="M 66 44 
           L 110 70 
           L 111 66 
           L 111 74 
           L 109 74 
           L 66 58 
           Z"
        fill="url(#a380Body)"
        opacity="0.95"
      />
      {/* Right Wingtip Fence */}
      <polygon points="109,64 112,64 113,75 110,75" fill="#38bdf8" />

      {/* Horizontal Stabilizers (Tail Wings) */}
      <polygon points="56,98 34,110 34,113 57,105" fill="url(#a380Body)" opacity="0.85" />
      <polygon points="64,98 86,110 86,113 63,105" fill="url(#a380Body)" opacity="0.85" />

      {/* 4 TURBOFAN ENGINES (Iconic A380 Quad-Engine Configuration) */}
      {/* Left Outboard Engine 1 */}
      <rect x="22" y="66" width="4.5" height="11" rx="2" fill="url(#a380Engine)" stroke="#93c5fd" strokeWidth="0.6" />
      <ellipse cx="24.25" cy="66" rx="2.25" ry="1.2" fill="#e0f2fe" />

      {/* Left Inboard Engine 2 */}
      <rect x="36" y="59" width="5" height="12" rx="2.5" fill="url(#a380Engine)" stroke="#93c5fd" strokeWidth="0.6" />
      <ellipse cx="38.5" cy="59" rx="2.5" ry="1.3" fill="#e0f2fe" />

      {/* Right Inboard Engine 3 */}
      <rect x="79" y="59" width="5" height="12" rx="2.5" fill="url(#a380Engine)" stroke="#93c5fd" strokeWidth="0.6" />
      <ellipse cx="81.5" cy="59" rx="2.5" ry="1.3" fill="#e0f2fe" />

      {/* Right Outboard Engine 4 */}
      <rect x="93.5" y="66" width="4.5" height="11" rx="2" fill="url(#a380Engine)" stroke="#93c5fd" strokeWidth="0.6" />
      <ellipse cx="95.75" cy="66" rx="2.25" ry="1.2" fill="#e0f2fe" />

      {/* Engine Pylons */}
      <line x1="24.25" y1="67" x2="24.25" y2="62" stroke="#60a5fa" strokeWidth="0.8" />
      <line x1="38.5" y1="60" x2="38.5" y2="54" stroke="#60a5fa" strokeWidth="0.8" />
      <line x1="81.5" y1="60" x2="81.5" y2="54" stroke="#60a5fa" strokeWidth="0.8" />
      <line x1="95.75" y1="67" x2="95.75" y2="62" stroke="#60a5fa" strokeWidth="0.8" />

      {/* Main Double-Decker Fuselage */}
      <path
        d="M 60 7 
           C 57 9, 53 14, 53 25 
           L 53 88 
           C 53 96, 56 104, 60 112 
           C 64 104, 67 96, 67 88 
           L 67 25 
           C 67 14, 63 9, 60 7 
           Z"
        fill="url(#a380Body)"
        stroke="#93c5fd"
        strokeWidth="0.8"
      />

      {/* A380 Cockpit Windshield (Distinctive nose window band) */}
      <path
        d="M 57 15 
           C 58.5 14, 61.5 14, 63 15 
           L 64 17 
           C 61.5 16, 58.5 16, 56 17 
           Z"
        fill="#0284c7"
      />

      {/* UPPER DECK Window Line (Signature A380 Full Length Upper Deck) */}
      <line x1="55" y1="23" x2="55" y2="78" stroke="#ffffff" strokeWidth="0.9" strokeDasharray="1.2 1.2" opacity="0.85" />
      <line x1="65" y1="23" x2="65" y2="78" stroke="#ffffff" strokeWidth="0.9" strokeDasharray="1.2 1.2" opacity="0.85" />

      {/* MAIN DECK Window Line (Lower Deck) */}
      <line x1="54" y1="27" x2="54" y2="82" stroke="#bae6fd" strokeWidth="0.9" strokeDasharray="1.2 1.2" opacity="0.75" />
      <line x1="66" y1="27" x2="66" y2="82" stroke="#bae6fd" strokeWidth="0.9" strokeDasharray="1.2 1.2" opacity="0.75" />

      {/* Vertical Tailfin Spine (Huge A380 Stabilizer) */}
      <path
        d="M 59.3 78 
           L 60.7 78 
           L 61.2 108 
           L 58.8 108 
           Z"
        fill="#60a5fa"
      />
      <polygon points="59,85 61,85 60.6,112 59.4,112" fill="#ffffff" opacity="0.9" />

      {/* Navigation Lights (Red left, Green right) */}
      <circle cx="8.5" cy="69" r="1.2" fill="#ef4444" />
      <circle cx="111.5" cy="69" r="1.2" fill="#10b981" />
    </svg>
  );
}

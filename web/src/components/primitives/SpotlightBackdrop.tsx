import React from 'react';

/**
 * Industry-themed backdrop for Yaler.
 * Three layers at very low opacity:
 * 1. Dashed blueprint grid — technical/operational feel
 * 2. Horizontal ruled lines — work-order / job-sheet texture
 * 3. Scattered kitchen equipment silhouettes (Lucide-style SVG paths)
 */
export default function SpotlightBackdrop() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Layer 0: existing paper grain */}
      <div className="absolute inset-0 paper-grain opacity-80" />

      {/* Layer 1: dashed blueprint grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="blueprint-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="3 3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" className="text-ink" />
      </svg>

      {/* Layer 2: horizontal ruled lines (work-order / job-sheet) */}
      <div className="absolute inset-0 backdrop-ruled-lines opacity-[0.035]" />

      {/* Layer 3: ambient colour blobs (refined from original) */}
      <div className="absolute -top-24 right-[-8%] w-[32rem] h-[32rem] rounded-full bg-mandate/[0.07]" />
      <div className="absolute bottom-[-12%] left-[-6%] w-[24rem] h-[24rem] rounded-full bg-escalate/[0.055]" />

      {/* Layer 4: scattered kitchen equipment silhouettes */}
      <div className="kitchen-backdrop">
        <KitchenSilhouettes />
      </div>
    </div>
  );
}

/**
 * Positioned kitchen equipment SVGs from Lucide icon paths (ISC license).
 * Each is rendered at ~3% opacity, rotated slightly for organic placement.
 */
function KitchenSilhouettes() {
  const icons = [
    { id: 'fridge', x: '8%', y: '18%', rotate: -6, path: 'M4 2h16a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM3 10h18M8 2v8M8 14v2' },
    { id: 'wrench', x: '85%', y: '28%', rotate: 12, path: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
    { id: 'thermometer', x: '78%', y: '72%', rotate: -8, path: 'M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0zM12 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z' },
    { id: 'fan', x: '12%', y: '68%', rotate: 15, path: 'M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412zM12 12a0.5 0.5 0 1 0 0-1 0.5 0.5 0 0 0 0 1z' },
    { id: 'gauge', x: '52%', y: '85%', rotate: 4, path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4l3 3M16.24 7.76l-1.41 1.41' },
    { id: 'plug', x: '42%', y: '12%', rotate: -10, path: 'M12 22v-5M9 8V2M15 8V2M7 8h10a3 3 0 0 1 3 3v2a5 5 0 0 1-5 5h-6a5 5 0 0 1-5-5v-2a3 3 0 0 1 3-3z' },
  ];

  return (
    <>
      {icons.map(({ id, x, y, rotate, path }, idx) => (
        <svg
          key={id}
          className={`absolute w-12 h-12 text-ink opacity-[0.04] kitchen-cutout ${idx % 2 === 1 ? 'kitchen-cutout-slow' : ''}`}
          style={{ left: x, top: y, transform: `rotate(${rotate}deg)` }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={path} />
        </svg>
      ))}
    </>
  );
}

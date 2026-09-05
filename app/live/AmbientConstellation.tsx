"use client";

import { useEffect } from "react";

const PARTICLES = Array.from({ length: 72 }, (_, i) => {
  const angle = i * 2.3999632297;
  const radius = 7 + ((i * 17) % 54);
  const x = 50 + Math.cos(angle) * radius * (1.15 - (i % 5) * 0.06);
  const y = 48 + Math.sin(angle) * radius * 0.62;
  const size = 2 + (i % 3);
  const delay = -((i * 0.37) % 9).toFixed(2);
  const duration = 7 + (i % 7) * 0.8;
  const palette = [
    "rgba(128,82,255,.72)",
    "rgba(255,184,41,.62)",
    "rgba(21,132,110,.58)",
    "rgba(194,119,255,.52)",
    "rgba(87,163,255,.48)",
  ];
  return { x, y, size, delay: `${delay}s`, duration: `${duration}s`, color: palette[i % palette.length], rotate: (i * 29) % 180 };
});

export default function AmbientConstellation() {
  useEffect(() => {
    let frame = 0;
    const onPointer = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        document.documentElement.style.setProperty("--qus-pointer-x", x.toFixed(4));
        document.documentElement.style.setProperty("--qus-pointer-y", y.toFixed(4));
      });
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return (
    <div className="qus-constellation" aria-hidden="true">
      <div className="qus-orbit qus-orbit-a" />
      <div className="qus-orbit qus-orbit-b" />
      <div className="qus-core-glow" />
      <div className="qus-particles">
        {PARTICLES.map((particle, index) => (
          <i
            key={index}
            className="qus-particle"
            style={
              {
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                borderColor: particle.color,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
                transform: `rotate(${particle.rotate}deg)`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <style jsx>{`
        .qus-constellation {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          opacity: .72;
          isolation: isolate;
        }
        .qus-particles {
          position: absolute;
          inset: -8%;
          transform: translate3d(calc(var(--qus-pointer-x, 0) * -18px), calc(var(--qus-pointer-y, 0) * -14px), 0);
          transition: transform .9s cubic-bezier(.16,1,.3,1);
        }
        .qus-particle {
          position: absolute;
          display: block;
          border: 1px solid;
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
          opacity: .08;
          animation: qusParticleDrift ease-in-out infinite alternate;
          filter: drop-shadow(0 0 5px currentColor);
        }
        .qus-particle:nth-child(3n) { opacity: .14; }
        .qus-particle:nth-child(7n) { opacity: .2; }
        .qus-orbit {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(68vw, 900px);
          aspect-ratio: 1.45;
          border: 1px solid rgba(128,82,255,.055);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-10deg) translate3d(calc(var(--qus-pointer-x, 0) * 12px), calc(var(--qus-pointer-y, 0) * 10px), 0);
          animation: qusOrbitFloat 16s ease-in-out infinite;
        }
        .qus-orbit-b {
          width: min(48vw, 640px);
          aspect-ratio: 1.5;
          border-color: rgba(255,184,41,.045);
          transform: translate(-50%, -50%) rotate(18deg);
          animation-duration: 21s;
          animation-direction: reverse;
        }
        .qus-core-glow {
          position: absolute;
          left: 50%;
          top: 46%;
          width: min(46vw, 560px);
          height: min(46vw, 560px);
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(128,82,255,.105) 0%, rgba(128,82,255,.028) 32%, transparent 70%);
          filter: blur(16px);
          animation: qusGlowBreathe 8s ease-in-out infinite;
        }
        @keyframes qusParticleDrift {
          0% { opacity: .05; transform: translate3d(0, 8px, 0) rotate(0deg) scale(.8); }
          50% { opacity: .18; }
          100% { opacity: .04; transform: translate3d(10px, -12px, 0) rotate(40deg) scale(1.18); }
        }
        @keyframes qusOrbitFloat {
          0%, 100% { margin-top: 0; }
          50% { margin-top: -14px; }
        }
        @keyframes qusGlowBreathe {
          0%, 100% { opacity: .5; transform: translate(-50%, -50%) scale(.92); }
          50% { opacity: .9; transform: translate(-50%, -50%) scale(1.05); }
        }
        @media (max-width: 768px) {
          .qus-constellation { opacity: .58; }
          .qus-particles { transform: none; }
          .qus-orbit { width: 120vw; }
          .qus-orbit-b { width: 92vw; }
          .qus-core-glow { width: 90vw; height: 90vw; }
        }
        @media (prefers-reduced-motion: reduce) {
          .qus-particles, .qus-orbit, .qus-core-glow { animation: none !important; transition: none !important; transform: none; }
        }
      `}</style>
    </div>
  );
}

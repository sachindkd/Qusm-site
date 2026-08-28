"use client";

import { useEffect } from "react";

export default function MotionShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const reveal = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        const visible = rect.top < window.innerHeight * 0.88 && rect.bottom > 0;
        if (visible) el.dataset.visible = "true";
      });

      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      root.style.setProperty("--scroll-y", `${window.scrollY}px`);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(reveal);
    };

    const onPointer = (event: PointerEvent) => {
      lastX = event.clientX / window.innerWidth - 0.5;
      lastY = event.clientY / window.innerHeight - 0.5;
      root.style.setProperty("--pointer-x", lastX.toFixed(4));
      root.style.setProperty("--pointer-y", lastY.toFixed(4));
    };

    reveal();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <div className="motion-shell">{children}</div>;
}

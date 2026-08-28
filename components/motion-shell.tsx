"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ReactNode, useEffect } from "react";

export default function MotionShell({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 80, damping: 20 });
  const rotate = useTransform(smoothX, [-1, 1], [-1.5, 1.5]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      x.set((event.clientX / window.innerWidth - 0.5) * 2);
      y.set((event.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [x, y]);

  return (
    <motion.div
      style={{ "--pointer-x": smoothX, "--pointer-y": smoothY, rotate } as React.CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

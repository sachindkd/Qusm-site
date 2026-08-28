"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function MotionShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      style={{ willChange: "auto" }}
    >
      {children}
    </motion.div>
  );
}

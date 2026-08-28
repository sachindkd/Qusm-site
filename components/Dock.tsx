"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export type DockItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export default function Dock({
  items,
  active,
  onSelect,
}: {
  items: DockItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-panel/90 backdrop-blur-xl px-2 py-2 shadow-2xl shadow-black/40">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="relative flex flex-col items-center justify-center w-14 h-12 rounded-xl group"
            >
              {isActive && (
                <motion.div
                  layoutId="dock-active"
                  className="absolute inset-0 bg-panel2 border border-borderhi rounded-xl"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <motion.div
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.92 }}
                className="relative z-10 flex flex-col items-center gap-0.5"
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={isActive ? "text-gold" : "text-textdim group-hover:text-white transition-colors"}
                />
                <span
                  className={`font-mono text-[8px] tracking-wide uppercase ${
                    isActive ? "text-gold" : "text-textfaint"
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

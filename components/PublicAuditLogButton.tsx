"use client";

import { usePathname } from "next/navigation";
import AuditLogButton from "@/app/admin/AuditLogButton";

export default function PublicAuditLogButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-7 sm:right-7">
      <AuditLogButton />
    </div>
  );
}

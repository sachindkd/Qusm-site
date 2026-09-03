import "./globals.css";
import "./revamp.css";
import "./live-v4.css";
import "./ui-revamp.css";
import "./profile-mobile-fix.css";
import "./live/mobile-functional.css";
import Providers from "@/components/Providers";
import PublicAuditLogButton from "@/components/PublicAuditLogButton";
import NotificationCenter from "@/components/NotificationCenter";
import PermissionTesterNav from "@/components/PermissionTesterNav";

export const metadata = {
  title: "QUSM — Quavy's United States Military",
  description: "Official information hub for Quavy's United States Military.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <PermissionTesterNav />
          <NotificationCenter />
          <PublicAuditLogButton />
        </Providers>
      </body>
    </html>
  );
}

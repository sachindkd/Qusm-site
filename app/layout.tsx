import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "QUSM — Quavy's United States Military",
  description: "Official information hub for Quavy's United States Military.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

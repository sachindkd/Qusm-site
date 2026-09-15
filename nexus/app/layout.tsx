import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'NEXUS — Discord AI', description: 'Autonomous AI control plane for Discord servers.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

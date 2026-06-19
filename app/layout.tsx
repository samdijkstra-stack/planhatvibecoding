import './globals.css';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Sidebar from '@/components/Sidebar';
import { verifySessionToken } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Planhat — Customer Success Platform',
  description: 'Customer Success Platform demo for CSMs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let sidebarUser: { name: string; initial: string; role: string } | null = null;
  try {
    const token = cookies().get('ph_session')?.value;
    if (token) {
      const u = verifySessionToken(token);
      if (u) sidebarUser = { name: u.name, initial: u.name[0].toUpperCase(), role: u.role };
    }
  } catch {
    // APP_ENCRYPTION_KEY not set or token invalid — no sidebar user
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <div className="flex h-screen overflow-hidden">
          {sidebarUser && <Sidebar user={sidebarUser} />}
          <main className="flex-1 overflow-y-auto bg-white">{children}</main>
        </div>
      </body>
    </html>
  );
}

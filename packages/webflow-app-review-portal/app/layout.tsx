import type { Metadata } from 'next';
import './globals.css';
import './portal.css';
export const metadata: Metadata = {
  title: 'App Review · Webflow',
  description: 'Review Webflow apps, test bundles, and communicate decisions.',
  icons: { icon: '/favicon.svg' }
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

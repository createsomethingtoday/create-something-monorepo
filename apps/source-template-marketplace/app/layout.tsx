import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Template Marketplace',
  description: 'Find your next website starting point.',
  robots: { index: false, follow: false }
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

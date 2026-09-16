import type { Metadata } from 'next';

import './styles.css';

export const metadata: Metadata = {
  title: 'Webflow Template Review MCP',
  description: 'Webflow Cloud origin for the CREATE SOMETHING Template Review MCP.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

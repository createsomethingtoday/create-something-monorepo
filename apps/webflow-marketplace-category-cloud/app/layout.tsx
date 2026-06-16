import './globals.css';
import { wfVisualSans } from './wf-visual-sans';

export const metadata = {
  title: 'Webflow template categories',
  description: 'Webflow Template Marketplace category pages rebuilt as a Webflow Cloud app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={wfVisualSans.variable}>{children}</body>
    </html>
  );
}

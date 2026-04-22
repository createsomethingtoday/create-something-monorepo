import './globals.css';
import { wfVisualSans } from './wf-visual-sans';

export const metadata = {
  title: 'Submit a template',
  description: 'Webflow Template Marketplace submission form'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={wfVisualSans.variable}>{children}</body>
    </html>
  );
}

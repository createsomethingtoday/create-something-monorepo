import './globals.css';

export const metadata = {
  title: 'Submit a template',
  description: 'Webflow Template Marketplace submission form'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

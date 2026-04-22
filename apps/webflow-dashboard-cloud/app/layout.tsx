import './globals.css';
import { AppShell } from '../components/app-shell';

export const metadata = {
  title: 'Webflow Dashboard Cloud',
  description: 'Creator dashboard and intake flow rebuilt for Webflow Cloud'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

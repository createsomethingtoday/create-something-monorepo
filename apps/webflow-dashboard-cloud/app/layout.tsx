import './globals.css';
import { withBasePath } from '../lib/runtime-paths';

export const metadata = {
  title: 'Webflow Dashboard Cloud',
  description: 'Creator dashboard and intake flow rebuilt for Webflow Cloud'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <nav className="nav-bar">
            <div className="nav-content">
              <a className="brand" href={withBasePath('/dashboard')}>
                Webflow Dashboard Cloud
              </a>
              <div className="nav-links">
                <a className="nav-link" href={withBasePath('/submit')}>
                  Submit
                </a>
                <a className="nav-link" href={withBasePath('/dashboard')}>
                  Dashboard
                </a>
                <a className="nav-link" href={withBasePath('/marketplace')}>
                  Marketplace
                </a>
                <a className="nav-link" href={withBasePath('/login')}>
                  Login
                </a>
              </div>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}

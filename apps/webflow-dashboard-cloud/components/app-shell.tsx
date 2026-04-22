'use client';

import { usePathname } from 'next/navigation';
import { appPath } from '../lib/runtime-paths';

function isSubmitRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /\/submit\/?$/.test(pathname);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = isSubmitRoute(pathname);

  return (
    <div className="app-shell">
      {!chromeless ? (
        <nav className="nav-bar">
          <div className="nav-content">
            <a className="brand" href={appPath('/dashboard')}>
              Webflow Dashboard Cloud
            </a>
            <div className="nav-links">
              <a className="nav-link" href={appPath('/submit')}>
                Submit
              </a>
              <a className="nav-link" href={appPath('/dashboard')}>
                Dashboard
              </a>
              <a className="nav-link" href={appPath('/marketplace')}>
                Marketplace
              </a>
              <a className="nav-link" href={appPath('/login')}>
                Login
              </a>
            </div>
          </div>
        </nav>
      ) : null}
      {children}
    </div>
  );
}

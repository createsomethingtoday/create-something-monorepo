import { LoginForm } from '../../components/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1 className="auth-title">Asset Dashboard</h1>
        <p className="auth-subtitle">
          Sign in to manage your creator profile, assets, and marketplace submissions.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}

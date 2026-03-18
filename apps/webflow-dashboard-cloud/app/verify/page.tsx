import { VerifyForm } from '../../components/verify-form';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-subtitle">
          Use the link from your verification email or paste the token below.
        </p>
        <VerifyForm initialToken={token} />
      </section>
    </main>
  );
}

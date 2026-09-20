export function isReviewer(identity: App.Locals['identity'], env: App.Platform['env']) {
  return (
    !!identity &&
    String(env.PCN_ADMIN_EMAILS || '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .includes(identity.email.toLowerCase())
  );
}

/** Only the worker's verified, per-session Cloudflare Access props can identify a reviewer. */
export function reviewerSession(
  props: { authMode?: string; accountId?: string; email?: string; name?: string | null } | undefined
) {
  if (props?.authMode !== 'cloudflare-access' || !props.accountId || !props.email) {
    return {
      ok: false,
      error: {
        code: 'USER_SESSION_REQUIRED',
        message: 'A per-user Cloudflare Access session is required.'
      }
    };
  }
  return {
    ok: true,
    data: {
      accountId: props.accountId,
      email: props.email,
      name: props.name ?? null,
      authMode: 'cloudflare-access'
    }
  };
}

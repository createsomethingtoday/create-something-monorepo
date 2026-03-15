import { redirect } from "@sveltejs/kit";
const GET = async ({ url }) => {
  const redirectTo = url.searchParams.get("redirect") || "/";
  redirect(302, `/api/auth/login?screen_hint=signup&redirect=${encodeURIComponent(redirectTo)}`);
};
export {
  GET
};

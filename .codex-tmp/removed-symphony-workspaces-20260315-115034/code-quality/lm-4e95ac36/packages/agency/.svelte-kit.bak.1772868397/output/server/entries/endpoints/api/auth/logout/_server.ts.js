import { handleLogout } from "../../../../../chunks/session.js";
const POST = async ({ request, cookies, platform }) => {
  return handleLogout(request, cookies, platform);
};
export {
  POST
};

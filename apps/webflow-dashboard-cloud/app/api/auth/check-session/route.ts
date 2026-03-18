import { jsonNoStore } from '../../../../lib/server/responses';
import { getUserFromRequest } from '../../../../lib/server/session';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return jsonNoStore({ authenticated: false }, { status: 401 });
  }

  return jsonNoStore({
    authenticated: true,
    user
  });
}

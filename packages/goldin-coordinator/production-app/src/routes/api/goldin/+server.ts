import { invokeProductionCoordinator } from "../../../../../production-browser.mjs";
export const POST = ({ request, cookies, platform }) => invokeProductionCoordinator(request, cookies, platform?.env ?? {});

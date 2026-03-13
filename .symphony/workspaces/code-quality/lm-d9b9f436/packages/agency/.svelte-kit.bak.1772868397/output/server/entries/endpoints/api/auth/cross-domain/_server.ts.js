import { c as createCrossDomainHandler } from "../../../../../chunks/handlers.js";
import { g as getIdentityErrorMessage, i as identityClient } from "../../../../../chunks/identity-client.js";
const GET = createCrossDomainHandler({
  identityClient,
  getIdentityErrorMessage
});
export {
  GET
};

import { start } from "./server.mjs";
import { defaultHome } from "./runtime.mjs";
start({
  port: 4320,
  repositoryHome: process.env.COLLABORATION_HOME || defaultHome,
});

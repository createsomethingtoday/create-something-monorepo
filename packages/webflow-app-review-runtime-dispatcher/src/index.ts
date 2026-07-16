import { e2bRuntimeObservationLauncher } from './e2b-launcher';
import { createDispatcherHandler, type DispatcherEnv } from './handler';

const handle = createDispatcherHandler(e2bRuntimeObservationLauncher);

export default {
  fetch(request: Request, env: DispatcherEnv): Promise<Response> {
    return handle(request, env);
  }
};

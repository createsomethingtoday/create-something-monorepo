export function proxyDiscoveryAgent(request:Request,action:string,options?:{secret?:string;disabled?:boolean;expectedOrigin?:string;fetcher?:typeof fetch}):Promise<Response>;

export const page = $state({
  url: new URL(window.location.href),
  state: {} as any,
  params: {
    id: window.location.pathname.replace('/n/synthetic-workshop/paths', '/paths').split('/')[2]
  }
});

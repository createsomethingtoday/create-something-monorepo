export const page = $state({
  url: new URL(window.location.href),
  state: {} as any,
  params: { id: window.location.pathname.split('/')[2] }
});

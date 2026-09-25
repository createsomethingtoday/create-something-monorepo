const url = new URL(window.location.href);
export const page = $state({ url, params: url.searchParams.get('view') === 'detail-unavailable' ? {id:'unavailable'} : {}, status: Number(url.searchParams.get('status') || 404), error: {message: 'This page could not be loaded.'}, state: {} });

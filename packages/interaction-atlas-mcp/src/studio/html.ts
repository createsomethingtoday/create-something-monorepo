export function renderStudioHtml(assetVersion: string): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Atlas Studio</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%23111218' d='M16 3 28 10v12l-12 7-12-7V10z'/%3E%3Cpath fill='%23f7f5ef' d='M16 6.5 24.5 11 16 15.5 7.5 11z'/%3E%3Cpath fill='%23b8c4ff' d='M7.5 13.5 16 18v7l-8.5-4.5z'/%3E%3Cpath fill='%236f8cff' d='M24.5 13.5 16 18v7l8.5-4.5z'/%3E%3C/svg%3E" />
    <link rel="stylesheet" href="/studio/assets/app.css?v=${assetVersion}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/studio/assets/app.js?v=${assetVersion}"></script>
  </body>
</html>`;
}

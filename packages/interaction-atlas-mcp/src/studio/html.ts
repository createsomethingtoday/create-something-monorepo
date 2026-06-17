export function renderStudioHtml(): string {
  return String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Atlas Studio</title>
    <link rel="stylesheet" href="/studio/assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/studio/assets/app.js"></script>
  </body>
</html>`;
}

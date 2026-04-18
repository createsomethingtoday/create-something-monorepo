import './globals.css';

export const metadata = {
  title: 'Submit a template',
  description: 'Webflow Template Marketplace submission form'
};

// Webflow marketplace shared CSS. Hash-versioned; see README for the update process
// if/when Webflow rotates the URL. Pulled live so the form inherits the canonical
// .field-input / .button-sp / .ts_link / :root token system.
const WEBFLOW_MARKETPLACE_CSS =
  'https://cdn.prod.website-files.com/5e593fb060cf87bbaf75dd20/css/template-marketplace.webflow.shared.654a57c9583f8111cb371d48.64cfa4961.min.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={WEBFLOW_MARKETPLACE_CSS} crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}

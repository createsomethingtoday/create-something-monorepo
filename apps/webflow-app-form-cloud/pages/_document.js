import { Html, Head, Main, NextScript } from 'next/document'
import { withAssetPrefix } from '../lib/runtimePaths';

function withDocumentAssetPrefix(path, assetPrefix = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!assetPrefix) {
    return withAssetPrefix(normalizedPath);
  }

  const normalizedPrefix = assetPrefix.replace(/\/+$/, '');
  return `${normalizedPrefix}${normalizedPath}`;
}

export default function Document(props) {
  const assetPrefix = props?.__NEXT_DATA__?.assetPrefix || '';

  return (
    <Html lang="en">
      <Head>
        {/* Load Webflow CSS files locally */}
        <link
          rel="stylesheet"
          href={withDocumentAssetPrefix('/webflow-shared.css', assetPrefix)}
          type="text/css"
          media="all"
        />
        <link
          rel="stylesheet"
          href={withDocumentAssetPrefix('/webflow-main.css', assetPrefix)}
          type="text/css"
          media="all"
        />
        <link
          rel="stylesheet"
          href={withDocumentAssetPrefix('/webflow-marketing.css', assetPrefix)}
          type="text/css"
          media="all"
        />
        <link
          rel="stylesheet"
          href={withDocumentAssetPrefix('/custom-form-styles.css', assetPrefix)}
          type="text/css"
          media="all"
        />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/quill@2.0.1/dist/quill.snow.css" />
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        {/* Minimal iframe-only CSS - no styling overrides */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Essential iframe rendering only */
            body {
              margin: 0;
              padding: 1.5rem;
              overflow-x: hidden;
            }

            /* App name disabled input */
            #app-name-disabled {
              background-color: transparent;
            }

            /* Only CSS variables for dark mode - no styling overrides */
            :root {
              --_color---neutral--white: #ffffff;
              --_color---neutral--black: #080808;
              --_color---neutral--gray-100: #f0f0f0;
              --_color---neutral--gray-300: #ababab;
              --_color---neutral--gray-400: #898989;
              --_color---neutral--gray-600: #5a5a5a;
              --_color---neutral--gray-900: #171717;
              --_color---primary--webflow-blue: #146ef5;
              --_color---primary--blue-600: #1058c7;
              --_color---secondary--green: #00d722;
              --_color---secondary--red: #ee1d36;
              --_color---secondary--yellow: #ffae13;
              --_typography---fonts--primary-font: "WF Visual Sans Variable", Arial, sans-serif;
            }

            /* Dark mode variable updates only */
            @media (prefers-color-scheme: dark) {
              :root {
                --_color---neutral--white: #080808;
                --_color---neutral--black: #ffffff;
                --_color---neutral--gray-100: #171717;
                --_color---neutral--gray-300: #ababab;
                --_color---neutral--gray-600: #5a5a5a;
                --_color---neutral--gray-900: #f0f0f0;
              }
            }

            .u-mode-dark {
              --_color---neutral--white: #080808;
              --_color---neutral--black: #ffffff;
              --_color---neutral--gray-100: #171717;
              --_color---neutral--gray-300: #ababab;
              --_color---neutral--gray-600: #5a5a5a;
              --_color---neutral--gray-900: #f0f0f0;
            }

            /* Button styling with proper white text - use hardcoded white, not CSS variable */
            .btn,
            button.btn,
            input.btn,
            .btn.w-button,
            button.btn.w-button,
            input.btn.w-button {
              padding: var(--_components---button--vertical-padding, 1em) var(--_components---button--horizontal-padding, 1.5em) !important;
              grid-column-gap: .4em;
              grid-row-gap: .4em;
              border-radius: var(--_components---button--border-radius, 0.25rem) !important;
              background-color: var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5)) !important;
              box-shadow: none !important;
              font-family: var(--_components---button--font, var(--_typography---fonts--primary-font, "WF Visual Sans Variable", Arial, sans-serif)) !important;
              color: #ffffff !important;
              font-size: var(--_components---button--font-size, 1rem) !important;
              line-height: var(--_components---button--line-height, 1.2em) !important;
              font-variation-settings: "wght" 500,"opsz" 20;
              font-weight: var(--_components---button--font-weight, 500) !important;
              letter-spacing: var(--_components---button--letter-spacing, -0.01em) !important;
              border-style: none !important;
              border: none !important;
              flex: none;
              justify-content: center;
              align-items: center;
              margin-left: 0;
              margin-right: 0;
              text-decoration: none !important;
              display: inline-flex;
              position: relative;
              cursor: pointer !important;
              transition: all 0.2s ease !important;
            }

            .btn:hover,
            button.btn:hover,
            input.btn:hover,
            .btn.w-button:hover,
            button.btn.w-button:hover,
            input.btn.w-button:hover {
              background-color: var(--_color---primary--blue-600, #1058c7) !important;
              color: #ffffff !important;
              text-decoration: none !important;
            }

            .btn:focus,
            button.btn:focus,
            input.btn:focus,
            .btn.w-button:focus,
            button.btn.w-button:focus,
            input.btn.w-button:focus {
              color: #ffffff !important;
              text-decoration: none !important;
              outline: none !important;
            }

            .btn:active,
            button.btn:active,
            input.btn:active,
            .btn.w-button:active,
            button.btn.w-button:active,
            input.btn.w-button:active {
              color: #ffffff !important;
              text-decoration: none !important;
            }

            .btn:visited,
            button.btn:visited,
            input.btn:visited,
            .btn.w-button:visited,
            button.btn.w-button:visited,
            input.btn.w-button:visited {
              color: #ffffff !important;
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

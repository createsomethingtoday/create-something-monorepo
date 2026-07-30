import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_URL, structuredData } from "./seo-content";

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Princess Pet Palace | Free Preschool Learning Game",
  description: SITE_DESCRIPTION,
  applicationName: "Princess Pet Palace",
  category: "education",
  keywords: [
    "preschool learning game",
    "letter recognition game",
    "counting game for kids",
    "educational animal game",
    "movement game for preschoolers",
    "free kids learning game",
  ],
  alternates: { canonical: SITE_URL },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Pet Palace",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Princess Pet Palace",
    title: "Princess Pet Palace | Free Preschool Learning Game",
    description: SITE_DESCRIPTION,
    images: [{ url: "/og.png", width: 1659, height: 948, alt: "Princess Pet Palace learning game with a princess, royal pets, and a purple castle" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Princess Pet Palace | Free Preschool Learning Game",
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#8d4caf",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          id="princess-pet-palace-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className={`${fredoka.variable} ${nunito.variable}`}>
        {children}
      </body>
    </html>
  );
}

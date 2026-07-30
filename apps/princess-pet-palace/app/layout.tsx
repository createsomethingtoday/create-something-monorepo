import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Princess Pet Palace",
    description:
      "A magical little learning game with letters, counting, animals, and movement.",
    openGraph: {
      title: "Princess Pet Palace",
      description: "Letters, counting, animals, and movement for little learners.",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "Princess Pet Palace learning game" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Princess Pet Palace",
      description: "Letters, counting, animals, and movement for little learners.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${nunito.variable}`}>
        {children}
      </body>
    </html>
  );
}

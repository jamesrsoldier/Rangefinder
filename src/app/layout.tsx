import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Rangefinder - GEO Analytics Platform",
  description: "Track brand visibility across AI answer engines",
};

// In mock mode, skip ClerkProvider (no Clerk session needed)
const isMockMode = process.env.USE_MOCK_ENGINE === 'true';

// Dynamically load ClerkProvider only when not in mock mode
const ClerkProvider: React.ComponentType<{ children: React.ReactNode }> | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  isMockMode ? null : require("@clerk/nextjs").ClerkProvider;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const body = (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );

  if (ClerkProvider) {
    return <ClerkProvider>{body}</ClerkProvider>;
  }

  return body;
}

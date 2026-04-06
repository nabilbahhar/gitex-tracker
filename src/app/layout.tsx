import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GITEX Tracker - Compucom",
  description: "Suivi d'activité salon GITEX Africa 2026",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GITEX Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-bg antialiased">
        {children}
      </body>
    </html>
  );
}

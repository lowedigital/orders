import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Journey Roasters",
  description: "Track your Journey Roasters coffee order, from roast to doorstep.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Loaded via a stylesheet link (not next/font/google) so the build
            doesn't depend on outbound network access to Google Fonts. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream text-espresso">{children}</body>
    </html>
  );
}

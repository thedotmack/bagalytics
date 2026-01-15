import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Diplomata_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const diplomataSC = Diplomata_SC({
  variable: "--font-diplomata",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bagalytics.dev"),
  title: "Bagalytics | Creator Fee Analytics",
  description: "Track your 1% creator fees from Bags.fm token trading volume. Real-time analytics, projections, and insights for token creators.",
  keywords: ["bags.fm", "creator fees", "solana", "token analytics", "crypto"],
  authors: [{ name: "Bagalytics" }],
  openGraph: {
    title: "Bagalytics | Creator Fee Analytics",
    description: "Track your 1% creator fees from Bags.fm token trading volume. Real-time analytics, projections, and insights for token creators.",
    url: "https://bagalytics.dev",
    siteName: "Bagalytics",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Bagalytics - Creator Fee Analytics for Bags.fm",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bagalytics | Creator Fee Analytics",
    description: "Track your 1% creator fees from Bags.fm token trading volume.",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${diplomataSC.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

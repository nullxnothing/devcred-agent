import type { Metadata } from "next";
import { Permanent_Marker, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const marker = Permanent_Marker({
  weight: "400",
  variable: "--font-marker",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevKarma - Prove Your History",
  description: "A developer reputation platform for Solana token creators.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${marker.variable} ${dmSans.variable} ${jetbrains.variable} antialiased bg-cream text-dark font-body`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

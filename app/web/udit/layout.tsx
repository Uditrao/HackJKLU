import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boli — Learn Indian Languages the Way They Are Spoken",
  description:
    "Learn Hindi, Tamil, Telugu, Kannada, and Marathi through real-life situations, culture, and everyday conversations. Not through memorization.",
  keywords:
    "Indian language learning, Hindi, Tamil, Telugu, Kannada, Marathi, language app",
  openGraph: {
    title: "Boli — Learn Indian Languages the Way They Are Spoken",
    description:
      "Not through memorization, but through everyday life, culture, and real situations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${inter.variable} antialiased`}>
      {children}
    </div>
  );
}

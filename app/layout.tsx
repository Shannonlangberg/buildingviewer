import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mt Barker Building",
  description:
    "Interactive floor plan and room galleries for Mt Barker campus.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${outfit.variable} ${dmSans.variable}`}>
      <body
        className={`${dmSans.className} min-h-screen bg-[#070a0f] font-sans text-slate-200 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

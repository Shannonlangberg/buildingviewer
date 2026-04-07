import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
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
    <html lang="en" className={`dark ${syne.variable} ${plusJakarta.variable}`}>
      <body
        className={`${plusJakarta.className} min-h-screen bg-[#060912] font-sans text-slate-200 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

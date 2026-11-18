import type { Metadata } from "next";
import { Bebas_Neue, Figtree } from "next/font/google";
import "./globals.css";

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SWH Basketball Club — Player Agreement",
  description:
    "Read the SWH Basketball Club player agreement and acknowledge it as the basis for team membership.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${figtree.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

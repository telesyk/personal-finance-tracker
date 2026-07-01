import type { Metadata } from "next";
import { Geist_Mono, Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-heading' });

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-sans' });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Family finance tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", montserrat.variable, poppins.variable, geistMono.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

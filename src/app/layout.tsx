import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "SLRJ DIGITAL | Bulk WhatsApp Outreach & Marketing Automation System",
  description:
    "Official enterprise WhatsApp Cloud API bulk messaging, ITU contact validation, approved template campaign manager and marketing automation platform for SLRJ DIGITAL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#08090d] text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

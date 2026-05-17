import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BackendDiagnostic } from "@/components/backend-diagnostic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LeadCap — AI Lead Intelligence OS",
  description: "AI-powered lead intelligence platform for local business outreach. Import, validate, score, and prioritize your leads.",
  keywords: ["leads", "CRM", "AI", "business intelligence", "outreach"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full dark`}>
      <body className="min-h-full flex font-[family-name:var(--font-inter)]">
        <Sidebar />
        <main className="flex-1 ml-[260px] min-h-screen">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>
        <BackendDiagnostic />
      </body>
    </html>
  );
}

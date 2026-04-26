import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VTcontroller – AI Work Management System",
  description: "AI-powered work operating system for modern teams. Manage projects, track execution, and get AI-driven insights.",
  keywords: "project management, AI, work management, team collaboration, task tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect to API for faster first-party data fetching */}
        <link rel="preconnect" href="http://localhost:8000" />
        <link rel="dns-prefetch" href="http://localhost:8000" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}


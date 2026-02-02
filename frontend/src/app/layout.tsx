import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบเลือกตั้งไทย (Thai Election System)",
  description: "ระบบสาธิตการเลือกตั้งที่โปร่งใสและตรวจสอบได้",
};

import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          prompt.variable,
          prompt.className
        )}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

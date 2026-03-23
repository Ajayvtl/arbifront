import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { Toaster } from "react-hot-toast";
import AppLayout from "@/components/AppLayout";

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <AuthProvider>
          <SettingsProvider>
            <Toaster position="top-right" />
            <AppLayout>
              {children}
            </AppLayout>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { Toaster } from "react-hot-toast";
import AppLayout from "@/components/AppLayout";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Toaster position="top-right" />
        <AppLayout>{children}</AppLayout>
      </SettingsProvider>
    </AuthProvider>
  );
}

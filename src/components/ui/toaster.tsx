"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#141e30",
          border: "1px solid rgba(20,30,48,0.08)",
          borderRadius: "14px",
          boxShadow: "0 8px 24px -8px rgba(20,30,48,0.1)",
        },
      }}
    />
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tuna Pre-Order Form",
  description: "Premium tuna pre-order form for event collection."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

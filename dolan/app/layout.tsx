import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Dolan — Temukan destinasi & teman perjalanan",
  description:
    "Rencanakan trip sesuai budget, lalu ajukan join trip publik — gratis. Biaya perjalanan ditanggung masing-masing.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Dolan",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#004ac6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

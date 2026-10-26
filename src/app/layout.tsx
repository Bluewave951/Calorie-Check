import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

const noto = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "Calorie&Check",
  description: "ถ่ายรูปอาหารแล้วประมาณแคลอรี่ทีละรายการ บันทึกรายวันเทียบกับเป้า",
  appleWebApp: { capable: true, title: "Calorie&Check", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={noto.variable}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
          {children}
        </div>
        <BottomNav />
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}

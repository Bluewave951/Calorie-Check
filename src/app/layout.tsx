import type { Metadata, Viewport } from "next";
import { Anuphan, Caprasimo, Figtree, Mitr } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { Toaster } from "@/components/Toaster";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// ฟอนต์ตามต้นแบบ templates/calorie-check
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-figtree" });
const anuphan = Anuphan({ subsets: ["thai", "latin"], weight: ["400", "600", "700"], variable: "--font-anuphan" });
const caprasimo = Caprasimo({ subsets: ["latin"], weight: "400", variable: "--font-caprasimo" });
const mitr = Mitr({ subsets: ["thai", "latin"], weight: ["400", "500"], variable: "--font-mitr" });

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
    { media: "(prefers-color-scheme: light)", color: "#f3fbf1" },
    { media: "(prefers-color-scheme: dark)", color: "#131a15" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${figtree.variable} ${anuphan.variable} ${caprasimo.variable} ${mitr.variable}`} suppressHydrationWarning>
      <head>
        {/* ใส่ data-theme ก่อนวาดหน้า กันจอกระพริบเมื่อเลือกธีมเอง */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto min-h-dvh w-full max-w-[430px] px-4 pb-[calc(172px+env(safe-area-inset-bottom))] pt-[calc(24px+env(safe-area-inset-top))]">
          {children}
        </div>
        <BottomNav />
        <Toaster />
        <ServiceWorker />
      </body>
    </html>
  );
}

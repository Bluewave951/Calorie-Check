import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ให้มือถือในวง Wi‑Fi เดียวกัน หรือผ่าน Tailscale (100.x และ *.ts.net) เปิดหน้า dev ได้
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "100.*.*.*", "*.ts.net"],
};

export default nextConfig;

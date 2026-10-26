import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Calorie&Check",
    short_name: "Calorie&Check",
    description: "ถ่ายรูปอาหารแล้วประมาณแคลอรี่ทีละรายการ",
    lang: "th",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f0",
    theme_color: "#fff8f0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

const numberFormat = new Intl.NumberFormat("th-TH");

export function formatKcal(kcal: number): string {
  return numberFormat.format(Math.round(kcal));
}

export function formatThaiDate(date: Date, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", ...options }).format(date);
}

export function formatShortWeekday(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(date);
}

export function greeting(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "อรุณสวัสดิ์";
  if (h >= 12 && h < 17) return "สวัสดีตอนบ่าย";
  if (h >= 17 && h < 21) return "สวัสดีตอนเย็น";
  return "ราตรีสวัสดิ์";
}

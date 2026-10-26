// ธีมเก็บใน localStorage (ไม่ใช่ IndexedDB) เพราะต้องอ่านได้ทันทีก่อนวาดหน้า กันจอกระพริบ

export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABEL: Record<Theme, string> = {
  auto: "อัตโนมัติ",
  light: "สว่าง",
  dark: "มืด",
};

export const THEME_STORAGE_KEY = "calorie-check:theme";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;
type ThemeRoot = { dataset: Record<string, string | undefined> };

export function parseTheme(value: string | null): Theme {
  return THEMES.find((theme) => theme === value) ?? "auto";
}

/** private mode หรือถูกบล็อก storage ก็ยังต้องได้ค่า */
export function loadTheme(storage: ThemeStorage = localStorage): Theme {
  try {
    return parseTheme(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

export function saveTheme(theme: Theme, storage: ThemeStorage = localStorage): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ใช้ธีมได้ในรอบนี้ แค่จำไม่ได้
  }
}

/** auto = ไม่มี data-theme ให้ CSS ตาม prefers-color-scheme */
export function applyTheme(theme: Theme, root: ThemeRoot = document.documentElement): void {
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/** สคริปต์ inline ใน <head> ใส่ data-theme ก่อนวาดหน้าแรก */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

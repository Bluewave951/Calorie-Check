import { describe, expect, it } from "vitest";
import { applyTheme, loadTheme, parseTheme, saveTheme, THEME_STORAGE_KEY } from "./theme";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

const throwingStorage = {
  getItem: (): string | null => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
};

describe("parseTheme", () => {
  it("รับเฉพาะ auto / light / dark", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("auto")).toBe("auto");
  });

  it("ค่าอื่นหรือไม่มีค่า ให้เป็น auto", () => {
    expect(parseTheme(null)).toBe("auto");
    expect(parseTheme("blue")).toBe("auto");
  });
});

describe("loadTheme / saveTheme", () => {
  it("บันทึกแล้วอ่านกลับได้ค่าเดิม", () => {
    const storage = fakeStorage();
    saveTheme("dark", storage);
    expect(storage.data[THEME_STORAGE_KEY]).toBe("dark");
    expect(loadTheme(storage)).toBe("dark");
  });

  it("storage ใช้ไม่ได้ ให้เป็น auto และไม่ throw", () => {
    expect(loadTheme(throwingStorage)).toBe("auto");
    expect(() => saveTheme("light", throwingStorage)).not.toThrow();
  });
});

describe("applyTheme", () => {
  it("light/dark ตั้ง data-theme, auto ลบออกให้ตามระบบ", () => {
    const root = { dataset: {} as Record<string, string | undefined> };
    applyTheme("dark", root);
    expect(root.dataset.theme).toBe("dark");
    applyTheme("auto", root);
    expect(root.dataset.theme).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { expectedWeight, programEndDate, programGoal, programIssues, programProgress, weeklySummary, weightChart } from "./program";
import type { BodyProfile, WeightProgram } from "./types";

// BMR = 10·80 + 6.25·175 − 5·30 + 5 = 1748.75 → TDEE (นั่งทำงาน ×1.2) = 2099
const profile: BodyProfile = { sex: "male", age: 30, heightCm: 175, weightKg: 80, activity: "sedentary", weightGoal: "lose" };

const program: WeightProgram = { startDate: "2026-10-27", startWeightKg: 80, targetWeightKg: 75, ratePerWeek: 0.5 };

describe("programGoal", () => {
  it("เป้าแคลอรี่ = TDEE − พลังงานที่ต้องขาดต่อวัน (ไขมัน 1 กก. ≈ 7,700 kcal)", () => {
    expect(programGoal(profile, 0.5)).toEqual({ tdee: 2099, goal: 1549, limited: false });
    expect(programGoal(profile, 0.25)).toEqual({ tdee: 2099, goal: 1824, limited: false });
  });

  it("ไม่ต่ำกว่าเป้าขั้นต่ำที่ปลอดภัยตามเพศ และบอกว่าถูกจำกัด", () => {
    expect(programGoal(profile, 0.75)).toEqual({ tdee: 2099, goal: 1500, limited: true });
  });

  it("ข้อมูลร่างกายนอกช่วงที่สูตรใช้ได้ → null", () => {
    expect(programGoal({ ...profile, age: 10 }, 0.5)).toBeNull();
  });
});

describe("programIssues", () => {
  it("น้ำหนักเป้าหมายต้องน้อยกว่าน้ำหนักเริ่มต้น", () => {
    expect(programIssues(80, 80, 175)).toBe("not_lower");
    expect(programIssues(80, 82, 175)).toBe("not_lower");
  });

  it("น้ำหนักเป้าหมายที่ทำให้ BMI ต่ำกว่า 18.5 ไม่ควรตั้ง", () => {
    // 175 ซม. → BMI 18.5 ≈ 56.7 กก.
    expect(programIssues(80, 56, 175)).toBe("target_underweight");
    expect(programIssues(80, 57, 175)).toBeNull();
  });
});

describe("programEndDate", () => {
  it("ลด 5 กก. ที่ 0.5 กก./สัปดาห์ = 10 สัปดาห์", () => {
    expect(programEndDate(program)).toBe("2027-01-05");
  });

  it("ปัดขึ้นเป็นวันเต็ม", () => {
    // 1 กก. ÷ 0.75 = 1.33 สัปดาห์ = 9.33 วัน → 10 วัน
    expect(programEndDate({ ...program, targetWeightKg: 79, ratePerWeek: 0.75 })).toBe("2026-11-06");
  });
});

describe("expectedWeight", () => {
  it("ลดลงเป็นเส้นตรงตามอัตราที่ตั้ง", () => {
    expect(expectedWeight(program, "2026-11-10")).toBe(79);
    expect(expectedWeight(program, "2026-11-03")).toBe(79.5);
  });

  it("ไม่ต่ำกว่าน้ำหนักเป้าหมาย และก่อนเริ่มโปรแกรม = น้ำหนักเริ่มต้น", () => {
    expect(expectedWeight(program, "2027-06-01")).toBe(75);
    expect(expectedWeight(program, "2026-10-01")).toBe(80);
  });
});

describe("programProgress", () => {
  const today = "2026-11-10"; // ตามแผนควรเป็น 79 กก.

  it("ลดไปแล้วกี่ กก. คิดเป็นกี่ % ของทั้งหมด", () => {
    expect(programProgress(program, 78.8, today)).toEqual({ lostKg: 1.2, percent: 24, expectedKg: 79, status: "on_track" });
  });

  it("เร็วกว่าแผนตั้งแต่ 0.5 กก. → ahead / ช้ากว่าแผนตั้งแต่ 0.5 กก. → behind", () => {
    expect(programProgress(program, 78.5, today).status).toBe("ahead");
    expect(programProgress(program, 79.5, today).status).toBe("behind");
    expect(programProgress(program, 79.4, today).status).toBe("on_track");
  });

  it("ถึงน้ำหนักเป้าหมายแล้ว → done และไม่เกิน 100%", () => {
    expect(programProgress(program, 74.6, today)).toMatchObject({ percent: 100, status: "done" });
  });

  it("น้ำหนักขึ้นจากตอนเริ่ม → % ไม่ติดลบ", () => {
    expect(programProgress(program, 81, today)).toMatchObject({ lostKg: -1, percent: 0, status: "behind" });
  });
});

describe("weeklySummary", () => {
  const goal = 1500;
  // 7 วันที่ผ่านมา (ไม่รวมวันนี้ที่ยังกินไม่จบ) = 2026-10-20 ถึง 2026-10-26
  const today = "2026-10-27";

  it("นับวันที่บันทึก วันที่กินตามเป้า (80–105% ของเป้า) และค่าเฉลี่ย", () => {
    const totals = {
      "2026-10-19": 3000, // เก่ากว่า 7 วัน ไม่นับ
      "2026-10-20": 1500,
      "2026-10-21": 1200, // 80% พอดี = ตามเป้า
      "2026-10-22": 1575, // 105% พอดี = ตามเป้า
      "2026-10-23": 1100, // น้อยเกิน
      "2026-10-24": 2000, // เกิน
      "2026-10-27": 300, // วันนี้ ไม่นับ
    };
    expect(weeklySummary(totals, goal, today)).toEqual({
      from: "2026-10-20",
      to: "2026-10-26",
      loggedDays: 5,
      onTargetDays: 3,
      underDays: 1,
      overDays: 1,
      average: 1475,
      tip: "keep_going",
      days: [
        { date: "2026-10-20", kcal: 1500, status: "on_target" },
        { date: "2026-10-21", kcal: 1200, status: "on_target" },
        { date: "2026-10-22", kcal: 1575, status: "on_target" },
        { date: "2026-10-23", kcal: 1100, status: "under" },
        { date: "2026-10-24", kcal: 2000, status: "over" },
        { date: "2026-10-25", kcal: null, status: "none" },
        { date: "2026-10-26", kcal: null, status: "none" },
      ],
    });
  });

  it("บันทึกไม่ถึง 5 วันใน 7 วัน → ยังสรุปไม่ได้ แนะนำให้บันทึกให้ครบ", () => {
    const totals = { "2026-10-20": 1500, "2026-10-21": 1500, "2026-10-22": 1500, "2026-10-23": 1500 };
    expect(weeklySummary(totals, goal, today).tip).toBe("log_more");
  });

  it("บันทึกครบพอแล้ว: เฉลี่ยเกินเป้า → แนะนำให้ลด / เฉลี่ยน้อยเกิน → เตือนว่ากินน้อยไป / ปกติ → ชม", () => {
    const week = (kcal: number) =>
      Object.fromEntries(["20", "21", "22", "23", "24", "25", "26"].map((d) => [`2026-10-${d}`, kcal]));
    expect(weeklySummary(week(1700), goal, today).tip).toBe("eat_less");
    expect(weeklySummary(week(1000), goal, today).tip).toBe("eat_more");
    expect(weeklySummary(week(1450), goal, today).tip).toBe("keep_going");
  });

  it("ไม่มีบันทึกเลย → ค่าเฉลี่ย 0 และแนะนำให้บันทึก", () => {
    expect(weeklySummary({}, goal, today)).toMatchObject({ loggedDays: 0, average: 0, tip: "log_more" });
  });
});

describe("weightChart", () => {
  const weights = [
    { date: "2026-10-20", weightKg: 81 }, // ก่อนเริ่มโปรแกรม ไม่แสดง
    { date: "2026-11-03", weightKg: 79.6 },
    { date: "2026-10-27", weightKg: 80 },
  ];

  it("แสดงน้ำหนักตั้งแต่วันเริ่มโปรแกรม เรียงตามวัน และเส้นแผนจากจุดเริ่มถึงเป้าหมาย", () => {
    expect(weightChart(program, weights, "2026-11-05")).toEqual({
      from: "2026-10-27",
      to: "2027-01-05",
      actual: [
        { date: "2026-10-27", weightKg: 80 },
        { date: "2026-11-03", weightKg: 79.6 },
      ],
      plan: [
        { date: "2026-10-27", weightKg: 80 },
        { date: "2027-01-05", weightKg: 75 },
      ],
      minKg: 74.5,
      maxKg: 80.5,
    });
  });

  it("เลยวันที่คาดว่าจะถึงเป้าแล้ว → แกนเวลายาวถึงวันนี้ และแกนน้ำหนักครอบน้ำหนักที่ขึ้นเกินจุดเริ่ม", () => {
    const chart = weightChart(program, [{ date: "2027-02-01", weightKg: 81.2 }], "2027-02-10");
    expect(chart).toMatchObject({ to: "2027-02-10", minKg: 74.5, maxKg: 81.7 });
  });
});

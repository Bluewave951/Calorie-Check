import { describe, expect, it } from "vitest";
import { MEAL_LABEL_EN, MEAL_TYPES } from "./types";

describe("MEAL_LABEL_EN", () => {
  it("ให้ชื่อภาษาอังกฤษของทุกมื้อ", () => {
    expect(MEAL_TYPES.map((meal) => MEAL_LABEL_EN[meal])).toEqual(["Breakfast", "Lunch", "Dinner", "Snack"]);
  });
});

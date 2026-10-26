import { MealCard } from "./MealCard";
import { MEAL_TYPES, type Scan } from "@/lib/types";

interface Props {
  date: string;
  scans: Scan[];
}

/** การ์ด 4 มื้อของวันหนึ่ง ใช้ทั้งหน้าหลักและหน้าประวัติ */
export function DayList({ date, scans }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {MEAL_TYPES.map((meal) => (
        <MealCard key={meal} meal={meal} date={date} scans={scans.filter((scan) => scan.meal === meal)} />
      ))}
    </div>
  );
}

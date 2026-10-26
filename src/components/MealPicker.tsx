import { MEAL_LABEL, MEAL_TYPES, type MealType } from "@/lib/types";

interface Props {
  value: MealType;
  onChange: (meal: MealType) => void;
}

export function MealPicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="มื้อ" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
      {MEAL_TYPES.map((meal) => {
        const active = meal === value;
        return (
          <button
            key={meal}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(meal)}
            className={`pressable min-h-11 rounded-lg text-sm font-medium ${
              active ? "bg-surface font-semibold text-text shadow-sm ring-1 ring-border" : "text-muted hover:text-text"
            }`}
          >
            {MEAL_LABEL[meal]}
          </button>
        );
      })}
    </div>
  );
}

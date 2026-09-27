"use client";

import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, "0"));

function splitTime(value: string) {
  const match = /^(\d{2})?:(\d{2})?$/.exec(value);
  return match ? [match[1] ?? "", match[2] ?? ""] as const : ["", ""] as const;
}

function joinTime(hour: string, minute: string) {
  if (hour && minute) return `${hour}:${minute}`;
  if (hour) return `${hour}:`;
  if (minute) return `:${minute}`;
  return "";
}

export default function TimeInput({
  label,
  name,
  defaultValue = "",
  value,
  onChange,
  required = false,
  chooseLabel = "เลือก",
}: {
  label: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  chooseLabel?: string;
}) {
  const [localValue, setLocalValue] = useState(defaultValue);
  const time = value ?? localValue;
  const [hour, minute] = splitTime(time);

  const update = (nextHour: string, nextMinute: string) => {
    const nextValue = joinTime(nextHour, nextMinute);
    if (value === undefined) setLocalValue(nextValue);
    onChange?.(nextValue);
  };

  return (
    <div className="min-w-0">
      <label className="block text-sm font-medium text-espresso">
        <span className="mb-1.5 block">{label}</span>
        <span className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d9c9ac] bg-[#faf8f3] px-3 focus-within:border-latte focus-within:bg-white">
          <select
            aria-label={`${label} ชั่วโมง`}
            value={hour}
            required={required}
            onChange={(event) => update(event.target.value, minute)}
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-base outline-none focus:ring-0"
          >
            <option value="" disabled>{required ? chooseLabel : "--"}</option>
            {HOURS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <span aria-hidden="true" className="font-semibold text-espresso/60">:</span>
          <select
            aria-label={`${label} นาที`}
            value={minute}
            required={required}
            onChange={(event) => update(hour, event.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-base outline-none focus:ring-0"
          >
            <option value="" disabled>{required ? chooseLabel : "--"}</option>
            {MINUTES.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </span>
      </label>
      {name && <input type="hidden" name={name} value={time} />}
    </div>
  );
}

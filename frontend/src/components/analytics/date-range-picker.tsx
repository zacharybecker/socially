"use client";

import { useState } from "react";
import { subDays, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsDateRange } from "@/types";

interface DateRangePickerProps {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange, start: string, end: string) => void;
}

const PRESETS: { value: AnalyticsDateRange; label: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "14d", label: "Last 14 days", days: 14 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last year", days: 365 },
];

function getDatesFromRange(range: AnalyticsDateRange): {
  start: string;
  end: string;
} {
  const preset = PRESETS.find((p) => p.value === range);
  const days = preset?.days ?? 30;
  const end = new Date();
  const start = subDays(end, days);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export { getDatesFromRange };

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const range = v as AnalyticsDateRange;
        const { start, end } = getDatesFromRange(range);
        onChange(range, start, end);
      }}
    >
      <SelectTrigger className="w-[180px] bg-white border-gray-200 text-gray-900">
        <CalendarIcon className="h-4 w-4 text-gray-500 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        {PRESETS.map((preset) => (
          <SelectItem
            key={preset.value}
            value={preset.value}
            className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
          >
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

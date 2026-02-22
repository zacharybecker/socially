"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const METRICS = [
  { value: "impressions", label: "Impressions" },
  { value: "reach", label: "Reach" },
  { value: "engagements", label: "Engagements" },
  { value: "likes", label: "Likes" },
  { value: "comments", label: "Comments" },
  { value: "shares", label: "Shares" },
  { value: "saves", label: "Saves" },
  { value: "videoViews", label: "Video Views" },
];

interface MetricSelectorProps {
  value: string;
  onChange: (metric: string) => void;
}

export function MetricSelector({ value, onChange }: MetricSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] bg-white border-gray-200 text-gray-900">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        {METRICS.map((metric) => (
          <SelectItem
            key={metric.value}
            value={metric.value}
            className="text-gray-700 focus:bg-gray-100 focus:text-gray-900"
          >
            {metric.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

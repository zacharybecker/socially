"use client";

import { type LucideIcon } from "lucide-react";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  icon?: LucideIcon;
}

export function UsageMeter({ label, current, limit, unit, icon: Icon }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

  const getBarColor = () => {
    if (isUnlimited) return "bg-coral-500";
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-coral-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-gray-500" />}
          <span className="text-sm font-medium text-gray-800">{label}</span>
        </div>
        <span className="text-sm text-gray-500">
          {current.toLocaleString()}{unit ? ` ${unit}` : ""} / {isUnlimited ? "Unlimited" : `${limit.toLocaleString()}${unit ? ` ${unit}` : ""}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200">
        {isUnlimited ? (
          <div className="h-full w-full rounded-full bg-coral-500/20" />
        ) : (
          <div
            className={`h-full rounded-full transition-all ${getBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

"use client";

interface TooltipEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatValue?: (value: number, name: string) => string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-gray-500">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: TooltipEntry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-700">{entry.name}:</span>
            <span className="text-xs font-semibold text-gray-900">
              {formatValue
                ? formatValue(entry.value, entry.name)
                : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

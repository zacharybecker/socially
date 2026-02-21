"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { Platform } from "@/types";

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: "tiktok", label: "TikTok", color: "#000000" },
  { value: "instagram", label: "Instagram", color: "#E4405F" },
  { value: "youtube", label: "YouTube", color: "#FF0000" },
  { value: "twitter", label: "Twitter/X", color: "#1DA1F2" },
  { value: "facebook", label: "Facebook", color: "#4267B2" },
  { value: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { value: "threads", label: "Threads", color: "#000000" },
  { value: "pinterest", label: "Pinterest", color: "#E60023" },
];

interface PlatformFilterProps {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
}

export function PlatformFilter({ selected, onChange }: PlatformFilterProps) {
  const allSelected = selected.length === 0;

  const togglePlatform = (platform: Platform) => {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <Filter className="h-4 w-4 mr-1.5" />
          Platforms
          {!allSelected && selected.length > 0 && (
            <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
              {selected.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 bg-slate-800 border-slate-700"
      >
        <DropdownMenuLabel className="text-slate-400 text-xs">
          Filter by Platform
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        {PLATFORMS.map((platform) => (
          <DropdownMenuCheckboxItem
            key={platform.value}
            checked={allSelected || selected.includes(platform.value)}
            onCheckedChange={() => togglePlatform(platform.value)}
            className="text-slate-300 focus:bg-slate-700 focus:text-white"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: platform.color }}
              />
              {platform.label}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

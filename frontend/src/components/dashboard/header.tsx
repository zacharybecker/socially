"use client";

import { useOrganization } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { currentOrganization } = useOrganization();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search..."
              className="w-64 pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  );
}

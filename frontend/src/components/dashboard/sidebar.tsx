"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth, useOrganization } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  BarChart3,
  Inbox,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  Sparkles,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Accounts", href: "/dashboard/accounts", icon: Users },
  { name: "Posts", href: "/dashboard/posts", icon: FileText },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "AI Studio", href: "/dashboard/ai", icon: Sparkles },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization } = useOrganization();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-white">Social Manager</span>
      </div>

      {/* Organization Selector */}
      <div className="px-4 py-4 border-b border-slate-800">
        <Select
          value={currentOrganization?.id || ""}
          onValueChange={(value) => {
            const org = Array.isArray(organizations) ? organizations.find((o) => o.id === value) : undefined;
            if (org) setCurrentOrganization(org);
          }}
        >
          <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {Array.isArray(organizations) && organizations.map((org) => (
              <SelectItem
                key={org.id}
                value={org.id}
                className="text-white focus:bg-slate-700 focus:text-white"
              >
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Create Post Button */}
      <div className="px-3 py-4 border-t border-slate-800">
        <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
          <Link href="/dashboard/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>

      {/* User Menu */}
      <div className="border-t border-slate-800 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-2 py-6 text-left hover:bg-slate-800"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.photoURL || undefined} />
                <AvatarFallback className="bg-slate-700 text-white">
                  {getInitials(userProfile?.displayName || user?.email || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">
                  {userProfile?.displayName || "User"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {userProfile?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-slate-800 border-slate-700"
          >
            <DropdownMenuLabel className="text-slate-400">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem asChild className="text-white focus:bg-slate-700 focus:text-white cursor-pointer">
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-red-400 focus:bg-slate-700 focus:text-red-400 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

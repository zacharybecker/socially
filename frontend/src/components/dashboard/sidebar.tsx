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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import { useState } from "react";
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

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const { organizations, currentOrganization, setCurrentOrganization, createOrganization } = useOrganization();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName("");
      setCreateOrgOpen(false);
      toast.success("Organization created");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  };

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
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-gray-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-semibold text-gray-900">Social Manager</span>
      </div>

      {/* Organization Selector */}
      <div className="px-4 py-4 border-b border-gray-200 space-y-2">
        <Select
          value={currentOrganization?.id || ""}
          onValueChange={(value) => {
            const org = Array.isArray(organizations) ? organizations.find((o) => o.id === value) : undefined;
            if (org) setCurrentOrganization(org);
          }}
        >
          <SelectTrigger className="w-full bg-gray-50 border-gray-200 text-gray-900">
            <SelectValue placeholder="Select organization" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {Array.isArray(organizations) && organizations.map((org) => (
              <SelectItem
                key={org.id}
                value={org.id}
                className="text-gray-900 focus:bg-gray-100 focus:text-gray-900"
              >
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          onClick={() => setCreateOrgOpen(true)}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Create Organization
        </Button>
        <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create Organization</DialogTitle>
              <DialogDescription className="text-gray-500">
                Enter a name for your new organization.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Organization name"
              className="bg-gray-50 border-gray-300 text-gray-900"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateOrg();
                }
              }}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateOrgOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrg}
                disabled={creatingOrg || !newOrgName.trim()}
                className="bg-coral-500 hover:bg-coral-600"
              >
                {creatingOrg ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Create Post Button */}
      <div className="px-3 py-4 border-t border-gray-200">
        <Button asChild className="w-full bg-coral-500 hover:bg-coral-600" onClick={onNavigate}>
          <Link href="/dashboard/posts/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>

      {/* User Menu */}
      <div className="border-t border-gray-200 p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-2 py-6 text-left hover:bg-gray-100"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userProfile?.photoURL || undefined} />
                <AvatarFallback className="bg-gray-200 text-gray-900">
                  {getInitials(userProfile?.displayName || user?.email || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-900">
                  {userProfile?.displayName || "User"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {userProfile?.email}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white border-gray-200"
          >
            <DropdownMenuLabel className="text-gray-500">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem asChild className="text-gray-900 focus:bg-gray-100 focus:text-gray-900 cursor-pointer">
              <Link href="/dashboard/settings" onClick={onNavigate}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-red-400 focus:bg-gray-100 focus:text-red-400 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export function Sidebar({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-white border-gray-200"
          showCloseButton={false}
        >
          <VisuallyHidden.Root>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden.Root>
          <SidebarContent onNavigate={() => onOpenChange?.(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

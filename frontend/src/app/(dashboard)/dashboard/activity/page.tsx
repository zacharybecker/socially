"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Users,
  Building2,
  CreditCard,
  Settings,
  Globe,
  Loader2,
  Calendar,
} from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { useOrganization } from "@/lib/hooks";
import { ActivityLogEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const resourceTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  post: { label: "Post", icon: FileText, color: "bg-blue-100 text-blue-700" },
  account: { label: "Account", icon: Globe, color: "bg-purple-100 text-purple-700" },
  organization: { label: "Organization", icon: Building2, color: "bg-green-100 text-green-700" },
  member: { label: "Member", icon: Users, color: "bg-amber-100 text-amber-700" },
  settings: { label: "Settings", icon: Settings, color: "bg-gray-200 text-gray-700" },
  billing: { label: "Billing", icon: CreditCard, color: "bg-pink-100 text-pink-700" },
};

export default function ActivityPage() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const fetchEntries = async (reset = false) => {
    if (!orgId) return;
    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(currentOffset));
      if (filter !== "all") params.set("resourceType", filter);

      const res = await api.get<{ success: boolean; data: ActivityLogEntry[] }>(
        `${endpoints.activity.list(orgId)}?${params.toString()}`
      );
      const data = res.data ?? [];

      if (reset) {
        setEntries(data);
        setOffset(data.length);
      } else {
        setEntries((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
      }
      setHasMore(data.length === limit);
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, filter]);

  return (
    <>
      <Header
        title="Activity Log"
        description="Track all actions and changes in your organization"
      />

      <div className="p-6 space-y-6">
        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Filter by:</span>
          <Select value={filter} onValueChange={(v) => { setFilter(v); setOffset(0); }}>
            <SelectTrigger className="w-48 bg-gray-50 border-gray-200 text-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all" className="text-gray-900 focus:bg-gray-100">All Activity</SelectItem>
              <SelectItem value="post" className="text-gray-900 focus:bg-gray-100">Posts</SelectItem>
              <SelectItem value="account" className="text-gray-900 focus:bg-gray-100">Accounts</SelectItem>
              <SelectItem value="organization" className="text-gray-900 focus:bg-gray-100">Organization</SelectItem>
              <SelectItem value="member" className="text-gray-900 focus:bg-gray-100">Members</SelectItem>
              <SelectItem value="settings" className="text-gray-900 focus:bg-gray-100">Settings</SelectItem>
              <SelectItem value="billing" className="text-gray-900 focus:bg-gray-100">Billing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entries */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Calendar className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
              <p className="text-sm text-gray-500 text-center max-w-md">
                Activity will appear here as you and your team make changes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const config = resourceTypeConfig[entry.resourceType] || resourceTypeConfig.post;
              const Icon = config.icon;

              return (
                <Card key={entry.id} className="bg-gray-50 border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.userDisplayName || "System"}
                          </span>
                          <span className="text-sm text-gray-700">{entry.action}</span>
                        </div>
                        {entry.details && (
                          <p className="text-sm text-gray-500 mb-2">{entry.details}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge className={config.color}>{config.label}</Badge>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-200"
                  onClick={() => fetchEntries(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

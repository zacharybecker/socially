"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, RefreshCw, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { SocialAccount, Platform } from "@/types";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { PlatformIcon } from "@/components/ui/platform-icon";

const platformConfig: Record<Platform, { name: string }> = {
  tiktok: { name: "TikTok" },
  instagram: { name: "Instagram" },
  youtube: { name: "YouTube" },
  twitter: { name: "X (Twitter)" },
  facebook: { name: "Facebook" },
  linkedin: { name: "LinkedIn" },
  threads: { name: "Threads" },
  pinterest: { name: "Pinterest" },
};

export default function AccountsPage() {
  const { currentOrganization } = useOrganization();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAccounts = async () => {
    if (!currentOrganization) return;
    try {
      const response = await api.get<{ success: boolean; data: SocialAccount[] }>(
        endpoints.accounts.list(currentOrganization.id)
      );
      setAccounts(response.data ?? []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [currentOrganization]);

  // Handle OAuth callback query params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected) {
      toast.success(`${platformConfig[connected as Platform]?.name ?? connected} connected successfully!`);
      fetchAccounts();
      // Clean up URL params
      window.history.replaceState({}, "", "/dashboard/accounts");
    } else if (error) {
      toast.error("Failed to connect account. Please try again.");
      window.history.replaceState({}, "", "/dashboard/accounts");
    }
  }, [searchParams]);

  const handleConnect = async (platform: Platform) => {
    if (!currentOrganization) {
      toast.error("Please select an organization first");
      return;
    }

    setConnecting(platform);

    try {
      const response = await api.get<{ success: boolean; data: { authUrl: string } }>(
        endpoints.accounts.connect(currentOrganization.id, platform)
      );
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error("Failed to get auth URL:", error);
      toast.error(`Failed to connect ${platformConfig[platform].name}`);
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: SocialAccount) => {
    if (!currentOrganization) return;

    try {
      await api.delete(
        endpoints.accounts.disconnect(currentOrganization.id, account.id)
      );
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success(`Disconnected ${account.username}`);
    } catch (error) {
      console.error("Failed to disconnect account:", error);
      toast.error("Failed to disconnect account");
    }
  };

  const handleRefresh = async (account: SocialAccount) => {
    if (!currentOrganization) return;

    try {
      await api.post(
        endpoints.accounts.refresh(currentOrganization.id, account.id)
      );
      toast.success(`Refreshed ${account.username}`);
      fetchAccounts();
    } catch (error) {
      console.error("Failed to refresh account:", error);
      toast.error("Failed to refresh account");
    }
  };

  const availablePlatforms: Platform[] = ["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "threads", "pinterest"];

  return (
    <>
      <Header
        title="Connected Accounts"
        description="Manage your social media accounts"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-coral-500 hover:bg-coral-600">
                <Plus className="mr-2 h-4 w-4" />
                Connect Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Connect a Social Account</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Choose a platform to connect. You&apos;ll be redirected to authorize access.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {availablePlatforms.map((platform) => {
                  const config = platformConfig[platform];
                  return (
                    <Button
                      key={platform}
                      variant="outline"
                      className="w-full justify-start gap-3 h-14 border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200"
                      onClick={() => handleConnect(platform)}
                      disabled={connecting !== null}
                    >
                      <PlatformIcon platform={platform} size={32} />
                      <span className="flex-1 text-left">{config.name}</span>
                      {connecting === platform ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 text-center">
                You&apos;ll be redirected to authorize access on the selected platform.
              </p>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 mb-4">
                <Plus className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts connected</h3>
              <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
                Connect your TikTok or Instagram accounts to start scheduling and publishing posts from one place.
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-coral-500 hover:bg-coral-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Connect Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => {
              const config = platformConfig[account.platform];
              return (
                <Card key={account.id} className="bg-gray-50 border-gray-200">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className="relative h-12 w-12">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={account.profileImage || undefined} />
                        <AvatarFallback className="bg-transparent">
                          <PlatformIcon platform={account.platform} size={48} className="rounded-full" />
                        </AvatarFallback>
                      </Avatar>
                      {account.profileImage && (
                        <PlatformIcon
                          platform={account.platform}
                          size={18}
                          className="absolute -bottom-0.5 -right-0.5 rounded-md ring-2 ring-white"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base text-gray-900">
                        @{account.username}
                      </CardTitle>
                      <CardDescription className="text-gray-500">
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                          {config.name}
                        </Badge>
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-200"
                        onClick={() => handleRefresh(account)}
                      >
                        <RefreshCw className="mr-2 h-3 w-3" />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-900 text-red-400 hover:bg-red-900/20"
                        onClick={() => handleDisconnect(account)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

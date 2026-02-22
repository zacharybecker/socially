"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { api, endpoints } from "@/lib/api";
import { Post, SocialAccount } from "@/types";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-gray-400",
  scheduled: "bg-blue-600",
  publishing: "bg-yellow-600",
  published: "bg-green-600",
  failed: "bg-red-600",
};

export default function DashboardPage() {
  const { currentOrganization } = useOrganization();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!currentOrganization) return;
      try {
        const [postsRes, accountsRes] = await Promise.all([
          api.get<{ success: boolean; data: Post[] }>(
            endpoints.posts.list(currentOrganization.id)
          ),
          api.get<{ success: boolean; data: SocialAccount[] }>(
            endpoints.accounts.list(currentOrganization.id)
          ),
        ]);
        if (cancelled) return;
        setPosts(postsRes.data ?? []);
        setAccounts(accountsRes.data ?? []);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        if (!cancelled) toast.error("Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [currentOrganization]);

  const totalPosts = posts.length;
  const published = posts.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const connectedAccounts = accounts.length;

  const stats = [
    { name: "Total Posts", value: totalPosts.toString(), icon: Calendar },
    { name: "Published", value: published.toString(), icon: CheckCircle2 },
    { name: "Scheduled", value: scheduled.toString(), icon: Calendar },
    { name: "Accounts", value: connectedAccounts.toString(), icon: Users },
  ];

  const recentPosts = posts.slice(0, 5);

  return (
    <>
      <Header
        title="Dashboard"
        description={currentOrganization ? `Welcome to ${currentOrganization.name}` : "Welcome back"}
      />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild className="bg-coral-500 hover:bg-coral-600">
            <Link href="/dashboard/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <Link href="/dashboard/accounts">
              <Users className="mr-2 h-4 w-4" />
              Connect Account
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.name} className="bg-gray-50 border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {stat.name}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Posts */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Posts</CardTitle>
              <CardDescription className="text-gray-500">
                Your latest scheduled and published posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : recentPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No posts yet</p>
                  <Button asChild size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-200">
                    <Link href="/dashboard/posts/new">Create your first post</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {post.content || "(No content)"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {post.platforms.length} platform{post.platforms.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge className={`${statusColors[post.status] || "bg-gray-400"} text-white text-xs`}>
                        {post.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Connected Accounts</CardTitle>
              <CardDescription className="text-gray-500">
                Manage your social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500 mb-4">No accounts connected</p>
                  <Button asChild size="sm" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-200">
                    <Link href="/dashboard/accounts">Connect an account</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-100"
                    >
                      <PlatformIcon platform={account.platform} size={32} className="rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">@{account.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{account.platform}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Analytics */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Performance Overview</CardTitle>
              <CardDescription className="text-gray-500">
                Engagement metrics for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm text-gray-500 mb-4">No data available yet</p>
                <p className="text-xs text-gray-400">
                  Analytics will appear once you start posting
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">AI Suggestions</CardTitle>
              <CardDescription className="text-gray-500">
                Personalized recommendations to improve your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-100">
                  <TrendingUp className="h-5 w-5 text-coral-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Connect your accounts</p>
                    <p className="text-xs text-gray-500">
                      Link your TikTok or Instagram to start scheduling posts
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-100">
                  <MessageCircle className="h-5 w-5 text-coral-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Try AI content generation</p>
                    <p className="text-xs text-gray-500">
                      Generate hooks, captions, and scripts with AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-100">
                  <Share2 className="h-5 w-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Schedule your first post</p>
                    <p className="text-xs text-gray-500">
                      Plan your content calendar for consistent posting
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

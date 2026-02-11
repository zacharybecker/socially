"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { api, endpoints } from "@/lib/api";
import { Post, SocialAccount } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

const statusColors: Record<string, string> = {
  draft: "bg-slate-600",
  scheduled: "bg-blue-600",
  publishing: "bg-yellow-600",
  published: "bg-green-600",
  failed: "bg-red-600",
};

export default function AnalyticsPage() {
  const { currentOrganization } = useOrganization();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        setPosts(postsRes.data ?? []);
        setAccounts(accountsRes.data ?? []);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentOrganization]);

  const totalPosts = posts.length;
  const published = posts.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const failed = posts.filter((p) => p.status === "failed").length;
  const connectedAccounts = accounts.length;

  const stats = [
    { name: "Total Posts", value: totalPosts.toString(), icon: FileText, color: "text-blue-400" },
    { name: "Published", value: published.toString(), icon: CheckCircle2, color: "text-green-400" },
    { name: "Scheduled", value: scheduled.toString(), icon: Clock, color: "text-yellow-400" },
    { name: "Drafts", value: drafts.toString(), icon: Calendar, color: "text-slate-400" },
    { name: "Failed", value: failed.toString(), icon: XCircle, color: "text-red-400" },
    { name: "Accounts", value: connectedAccounts.toString(), icon: Users, color: "text-purple-400" },
  ];

  const recentPosts = posts.slice(0, 10);

  return (
    <>
      <Header
        title="Analytics"
        description="Track your performance across all platforms"
      />

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {stats.map((stat) => (
                <Card key={stat.name} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="posts">
              <TabsList className="bg-slate-800 border-slate-700">
                <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 text-slate-300">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="posts" className="data-[state=active]:bg-slate-700 text-slate-300">
                  Posts
                </TabsTrigger>
                <TabsTrigger value="audience" className="data-[state=active]:bg-slate-700 text-slate-300">
                  Audience
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Engagement Over Time</CardTitle>
                      <CardDescription className="text-slate-400">
                        Views, likes, and comments trend
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col items-center justify-center py-16">
                        <BarChart3 className="h-16 w-16 text-slate-600 mb-4" />
                        <p className="text-sm text-slate-400">No data available</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Platform engagement metrics coming soon
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Post Status Breakdown</CardTitle>
                      <CardDescription className="text-slate-400">
                        Distribution of your posts by status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {totalPosts === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                          <TrendingUp className="h-16 w-16 text-slate-600 mb-4" />
                          <p className="text-sm text-slate-400">No posts yet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Create posts to see status breakdown
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 py-4">
                          {[
                            { label: "Published", count: published, color: "bg-green-500" },
                            { label: "Scheduled", count: scheduled, color: "bg-blue-500" },
                            { label: "Drafts", count: drafts, color: "bg-slate-500" },
                            { label: "Failed", count: failed, color: "bg-red-500" },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${item.color}`} />
                              <span className="text-sm text-slate-300 flex-1">{item.label}</span>
                              <span className="text-sm font-medium text-white">{item.count}</span>
                              <div className="w-24 bg-slate-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${item.color}`}
                                  style={{ width: `${totalPosts > 0 ? (item.count / totalPosts) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="posts" className="mt-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Posts</CardTitle>
                    <CardDescription className="text-slate-400">
                      Your latest posts and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentPosts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <TrendingUp className="h-16 w-16 text-slate-600 mb-4" />
                        <p className="text-sm text-slate-400">No posts to analyze</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Publish posts to see performance data
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentPosts.map((post) => (
                          <div
                            key={post.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">
                                {post.content || "(No content)"}
                              </p>
                              <p className="text-xs text-slate-400">
                                {post.platforms.length} platform{post.platforms.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Badge className={`${statusColors[post.status] || "bg-slate-600"} text-white text-xs`}>
                              {post.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audience" className="mt-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Audience Demographics</CardTitle>
                    <CardDescription className="text-slate-400">
                      Who is engaging with your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center py-16">
                      <Users className="h-16 w-16 text-slate-600 mb-4" />
                      <p className="text-sm text-slate-400">No audience data available</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Connect accounts to see audience insights
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}

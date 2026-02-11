"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  Edit,
  Eye,
  MoreVertical,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Post, PostStatus, SocialAccount } from "@/types";
import { format } from "date-fns";
import { api, endpoints } from "@/lib/api";
import { useOrganization } from "@/lib/hooks";
import { toast } from "sonner";

const statusConfig: Record<PostStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-slate-600", icon: Edit },
  scheduled: { label: "Scheduled", color: "bg-blue-600", icon: Clock },
  publishing: { label: "Publishing", color: "bg-yellow-600", icon: Loader2 },
  published: { label: "Published", color: "bg-green-600", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-600", icon: XCircle },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      if (!currentOrganization?.id) return;
      setLoading(true);
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
        console.error("Failed to fetch posts:", error);
        if (!cancelled) toast.error("Failed to load posts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [currentOrganization?.id]);

  const accountMap = new Map(accounts.map((a) => [a.id, a.username]));

  const filteredPosts = posts.filter((post) => {
    if (activeTab === "all") return true;
    return post.status === activeTab;
  });

  const handleDelete = async (postId: string) => {
    if (!currentOrganization?.id) return;
    try {
      await api.delete(endpoints.posts.delete(currentOrganization.id, postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  return (
    <>
      <Header
        title="Posts"
        description="Manage your content across all platforms"
        actions={
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Link href="/dashboard/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800 border-slate-700 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">
              All Posts
            </TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">
              Drafts
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">
              Published
            </TabsTrigger>
            <TabsTrigger value="failed" className="data-[state=active]:bg-slate-700 text-slate-300 data-[state=active]:text-white">
              Failed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Calendar className="h-16 w-16 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">
                    {activeTab === "all" ? "No posts yet" : `No ${activeTab} posts`}
                  </h3>
                  <p className="text-sm text-slate-400 text-center mb-6 max-w-md">
                    Create your first post to start building your content calendar and engaging with your audience.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Link href="/dashboard/posts/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Post
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => {
                  const status = statusConfig[post.status];
                  const StatusIcon = status.icon;

                  return (
                    <Card key={post.id} className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Media Preview */}
                          {post.mediaUrls.length > 0 ? (
                            <div className="h-20 w-20 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                              <img
                                src={post.mediaUrls[0]}
                                alt="Post media"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-20 w-20 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-8 w-8 text-slate-500" />
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${status.color} text-white`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              {post.scheduledAt && (
                                <span className="text-xs text-slate-400">
                                  {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white line-clamp-2 mb-2">
                              {post.content || "No caption"}
                            </p>
                            <div className="flex items-center gap-2">
                              {post.platforms.map((platform, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                                  @{accountMap.get(platform.accountId) || platform.accountId}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem asChild className="text-white focus:bg-slate-700 cursor-pointer">
                                <Link href={`/dashboard/posts/${post.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="text-white focus:bg-slate-700 cursor-pointer">
                                <Link href={`/dashboard/posts/${post.id}/edit`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(post.id)}
                                className="text-red-400 focus:bg-slate-700 focus:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

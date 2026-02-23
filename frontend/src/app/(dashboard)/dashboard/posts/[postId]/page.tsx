"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Send,
  Calendar,
  AlertCircle,
  Shield,
} from "lucide-react";
import { Post, PostStatus, SocialAccount } from "@/types";
import { format } from "date-fns";
import { api, endpoints } from "@/lib/api";
import { useAuth, useOrganization } from "@/lib/hooks";
import { Textarea } from "@/components/ui/textarea";
import { CommentsSection } from "@/components/posts/comments-section";
import { toast } from "sonner";

const statusConfig: Record<PostStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-gray-400", icon: Edit },
  scheduled: { label: "Scheduled", color: "bg-blue-600", icon: Clock },
  publishing: { label: "Publishing", color: "bg-yellow-600", icon: Loader2 },
  published: { label: "Published", color: "bg-green-600", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-600", icon: XCircle },
  pending_approval: { label: "Pending Approval", color: "bg-amber-600", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-600", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-rose-600", icon: XCircle },
};

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

function isVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [approvingPost, setApprovingPost] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectingPost, setRejectingPost] = useState(false);

  const getUserRole = () => {
    if (!user || !currentOrganization) return null;
    if (currentOrganization.ownerId === user.uid) return "admin";
    const member = currentOrganization.members?.find((m) => m.userId === user.uid);
    return member?.role || null;
  };
  const userRole = getUserRole();
  const isAdmin = userRole === "admin";

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      if (!orgId || !postId) return;
      setLoading(true);
      try {
        const [postRes, accountsRes] = await Promise.all([
          api.get<{ success: boolean; data: Post }>(endpoints.posts.get(orgId, postId)),
          api.get<{ success: boolean; data: SocialAccount[] }>(endpoints.accounts.list(orgId)),
        ]);
        if (cancelled) return;
        setPost(postRes.data ?? null);
        setAccounts(accountsRes.data ?? []);
      } catch {
        if (!cancelled) toast.error("Failed to load post");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [orgId, postId]);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const handlePublish = async () => {
    if (!orgId || !postId) return;
    setPublishing(true);
    try {
      await api.post(endpoints.posts.publish(orgId, postId));
      toast.success("Post published successfully");
      const postRes = await api.get<{ success: boolean; data: Post }>(endpoints.posts.get(orgId, postId));
      setPost(postRes.data ?? null);
    } catch {
      toast.error("Failed to publish post");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !postId) return;
    setDeleting(true);
    try {
      await api.delete(endpoints.posts.delete(orgId, postId));
      toast.success("Post deleted");
      router.push("/dashboard/posts");
    } catch {
      toast.error("Failed to delete post");
      setDeleting(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!orgId || !postId) return;
    setSubmittingApproval(true);
    try {
      await api.post(endpoints.approval.submit(orgId, postId));
      toast.success("Post submitted for approval");
      const postRes = await api.get<{ success: boolean; data: Post }>(endpoints.posts.get(orgId, postId));
      setPost(postRes.data ?? null);
    } catch {
      toast.error("Failed to submit for approval");
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleApprove = async () => {
    if (!orgId || !postId) return;
    setApprovingPost(true);
    try {
      await api.post(endpoints.approval.approve(orgId, postId));
      toast.success("Post approved");
      const postRes = await api.get<{ success: boolean; data: Post }>(endpoints.posts.get(orgId, postId));
      setPost(postRes.data ?? null);
    } catch {
      toast.error("Failed to approve post");
    } finally {
      setApprovingPost(false);
    }
  };

  const handleReject = async () => {
    if (!orgId || !postId || !rejectComment.trim()) return;
    setRejectingPost(true);
    try {
      await api.post(endpoints.approval.reject(orgId, postId), { comment: rejectComment.trim() });
      toast.success("Post rejected");
      setRejectDialogOpen(false);
      setRejectComment("");
      const postRes = await api.get<{ success: boolean; data: Post }>(endpoints.posts.get(orgId, postId));
      setPost(postRes.data ?? null);
    } catch {
      toast.error("Failed to reject post");
    } finally {
      setRejectingPost(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Post Details" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header title="Post Details" />
        <div className="p-6">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Post not found</h3>
              <p className="text-sm text-gray-500 mb-6">
                This post may have been deleted or you don&apos;t have access to it.
              </p>
              <Button asChild variant="outline" className="border-gray-200 text-gray-700">
                <Link href="/dashboard/posts">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Posts
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const status = statusConfig[post.status];
  const StatusIcon = status.icon;

  const canEdit = post.status === "draft" || post.status === "rejected" || post.status === "failed";
  const canPublish = post.status === "draft" || post.status === "rejected";
  const canRetry = post.status === "failed";
  const canDelete = post.status === "draft" || post.status === "rejected" || post.status === "scheduled" || post.status === "failed";
  const isReadOnly = post.status === "published" || post.status === "pending_approval" || post.status === "approved" || post.status === "publishing";

  return (
    <>
      <Header
        title="Post Details"
        actions={
          <Button asChild variant="outline" className="border-gray-200 text-gray-700">
            <Link href="/dashboard/posts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Posts
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Card */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900">Content</CardTitle>
                  <Badge className={`${status.color} text-white`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {post.content || "No caption"}
                </p>
              </CardContent>
            </Card>

            {/* Media Gallery */}
            {post.mediaUrls.length > 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Media</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {post.mediaUrls.map((url, idx) =>
                      isVideo(url) ? (
                        <video
                          key={idx}
                          src={url}
                          controls
                          className="w-full rounded-lg bg-gray-200 aspect-square object-cover"
                        />
                      ) : (
                        <img
                          key={idx}
                          src={url}
                          alt={`Media ${idx + 1}`}
                          className="w-full rounded-lg bg-gray-200 aspect-square object-cover"
                        />
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-Platform Status */}
            {post.platforms.length > 0 && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Platform Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {post.platforms.map((platform, idx) => {
                      const account = accountMap.get(platform.accountId);
                      const platformStatus = statusConfig[platform.status];
                      const PlatformStatusIcon = platformStatus.icon;

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            {account && (
                              <PlatformIcon platform={account.platform} size={28} />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              @{account?.username || platform.accountId}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${platformStatus.color} text-white`}>
                              <PlatformStatusIcon className="h-3 w-3 mr-1" />
                              {platformStatus.label}
                            </Badge>
                            {platform.errorMessage && (
                              <span className="text-xs text-red-500 max-w-xs truncate">
                                {platform.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <CommentsSection postId={postId} />
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            {/* Target Accounts */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Target Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {post.platforms.map((platform, idx) => {
                    const account = accountMap.get(platform.accountId);
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        {account && (
                          <PlatformIcon platform={account.platform} size={28} />
                        )}
                        <span className="text-sm text-gray-900">
                          @{account?.username || platform.accountId}
                        </span>
                      </div>
                    );
                  })}
                  {post.platforms.length === 0 && (
                    <p className="text-sm text-gray-500">No accounts selected</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule / Publish Time */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Timing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">
                      {format(new Date(post.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {post.scheduledAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500">Scheduled:</span>
                      <span className="text-gray-900">
                        {format(new Date(post.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                  {post.publishedAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-gray-500">Published:</span>
                      <span className="text-gray-900">
                        {format(new Date(post.publishedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Approval Status */}
            {post.approvalRequest && (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Status:</span>
                      <Badge
                        className={`text-white ${
                          post.approvalRequest.status === "approved"
                            ? "bg-emerald-600"
                            : post.approvalRequest.status === "rejected"
                            ? "bg-rose-600"
                            : "bg-amber-600"
                        }`}
                      >
                        {post.approvalRequest.status === "pending"
                          ? "Pending"
                          : post.approvalRequest.status === "approved"
                          ? "Approved"
                          : "Rejected"}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Requested:</span>{" "}
                      <span className="text-gray-900">
                        {format(new Date(post.approvalRequest.requestedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    {post.approvalRequest.reviewedAt && (
                      <div className="text-sm">
                        <span className="text-gray-500">Reviewed:</span>{" "}
                        <span className="text-gray-900">
                          {format(new Date(post.approvalRequest.reviewedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    )}
                    {post.approvalRequest.comment && (
                      <div className="text-sm">
                        <span className="text-gray-500">Comment:</span>{" "}
                        <span className="text-gray-900">{post.approvalRequest.comment}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {canEdit && (
                    <Button asChild className="w-full border-gray-200 text-gray-700" variant="outline">
                      <Link href={`/dashboard/posts/${postId}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Post
                      </Link>
                    </Button>
                  )}
                  {canPublish && (
                    <Button
                      className="w-full bg-coral-500 hover:bg-coral-600"
                      onClick={handlePublish}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Publish Now
                    </Button>
                  )}
                  {canRetry && (
                    <Button
                      className="w-full bg-coral-500 hover:bg-coral-600"
                      onClick={handlePublish}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Retry Publish
                    </Button>
                  )}
                  {(post.status === "draft" || post.status === "rejected") && (
                    <Button asChild className="w-full border-gray-200 text-gray-700" variant="outline">
                      <Link href={`/dashboard/posts/${postId}/edit`}>
                        <Clock className="mr-2 h-4 w-4" />
                        Schedule
                      </Link>
                    </Button>
                  )}
                  {post.status === "draft" && !isAdmin && (
                    <Button
                      className="w-full border-gray-200 text-gray-700"
                      variant="outline"
                      onClick={handleSubmitForApproval}
                      disabled={submittingApproval}
                    >
                      {submittingApproval ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="mr-2 h-4 w-4" />
                      )}
                      Submit for Approval
                    </Button>
                  )}
                  {post.status === "pending_approval" && isAdmin && (
                    <>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleApprove}
                        disabled={approvingPost}
                      >
                        {approvingPost ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        variant="outline"
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Post
                    </Button>
                  )}
                  {isReadOnly && !canRetry && !(post.status === "pending_approval" && isAdmin) && (
                    <p className="text-sm text-gray-500 text-center">
                      This post is {post.status === "publishing" ? "currently publishing" : post.status.replace("_", " ")}.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Delete Post</DialogTitle>
            <DialogDescription className="text-gray-500">
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Reject Post</DialogTitle>
            <DialogDescription className="text-gray-500">
              Please provide a reason for rejecting this post.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Reason for rejection..."
            className="min-h-[100px] bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400"
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-200 text-gray-700"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={rejectingPost || !rejectComment.trim()}
            >
              {rejectingPost ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

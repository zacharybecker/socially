"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { api, endpoints } from "@/lib/api";
import { useAuth, useOrganization } from "@/lib/hooks";
import { Comment } from "@/types";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchComments() {
      if (!orgId || !postId) return;
      try {
        const res = await api.get<{ success: boolean; data: Comment[] }>(
          endpoints.comments.list(orgId, postId)
        );
        if (!cancelled) setComments(res.data ?? []);
      } catch {
        // Silently fail - comments are supplementary
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchComments();
    return () => { cancelled = true; };
  }, [orgId, postId]);

  const handleSubmit = async () => {
    if (!orgId || !postId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; data: Comment }>(
        endpoints.comments.create(orgId, postId),
        { content: newComment.trim() }
      );
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!orgId || !postId) return;
    try {
      await api.delete(endpoints.comments.delete(orgId, postId, commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const canDelete = (comment: Comment) => {
    if (!user || !currentOrganization) return false;
    return (
      comment.userId === user.uid ||
      currentOrganization.ownerId === user.uid ||
      currentOrganization.members?.some(
        (m) => m.userId === user.uid && m.role === "admin"
      )
    );
  };

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-gray-500">({comments.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No comments yet. Start the conversation!
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-white border border-gray-200">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                    {comment.userDisplayName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.userDisplayName || "User"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {canDelete(comment) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-500"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Comment Form */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="min-h-[60px] bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            size="icon"
            className="bg-coral-500 hover:bg-coral-600 shrink-0 self-end"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

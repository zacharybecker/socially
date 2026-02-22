"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { createPostSchema, type CreatePostFormData } from "@/lib/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarIcon,
  Clock,
  Sparkles,
  Upload,
  X,
  Send,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SocialAccount, Post } from "@/types";
import { api, endpoints } from "@/lib/api";
import { PlatformIcon } from "@/components/ui/platform-icon";

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  const { currentOrganization } = useOrganization();

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "" },
  });
  const contentValue = form.watch("content");

  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
  const [newMediaPreviews, setNewMediaPreviews] = useState<string[]>([]);
  const newMediaPreviewsRef = useRef(newMediaPreviews);
  newMediaPreviewsRef.current = newMediaPreviews;
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(true);
  const [pinterestBoards, setPinterestBoards] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [selectedBoards, setSelectedBoards] = useState<Record<string, string>>({});

  // Fetch existing post
  useEffect(() => {
    let cancelled = false;
    const fetchPost = async () => {
      if (!currentOrganization) return;
      try {
        const response = await api.get<{ success: boolean; data: Post }>(
          endpoints.posts.get(currentOrganization.id, postId)
        );
        if (cancelled) return;
        const post = response.data;

        // Guard: redirect if published or publishing
        if (post.status === "published" || post.status === "publishing") {
          toast.warning("Published posts cannot be edited");
          router.replace(`/dashboard/posts/${postId}`);
          return;
        }

        // Pre-fill form
        form.reset({ content: post.content });
        setSelectedAccounts(post.platforms.map((p) => p.accountId));
        setExistingMediaUrls(post.mediaUrls || []);

        // Pre-fill Pinterest board selections from metadata
        const boards: Record<string, string> = {};
        for (const p of post.platforms) {
          if (p.metadata?.pinterestBoardId) {
            boards[p.accountId] = p.metadata.pinterestBoardId as string;
          }
        }
        if (Object.keys(boards).length > 0) {
          setSelectedBoards(boards);
        }

        // Pre-fill schedule
        if (post.scheduledAt) {
          setIsScheduling(true);
          const scheduledDate = new Date(post.scheduledAt);
          setScheduleDate(scheduledDate);
          const hours = scheduledDate.getHours().toString().padStart(2, "0");
          const minutes = scheduledDate.getMinutes() < 30 ? "00" : "30";
          setScheduleTime(`${hours}:${minutes}`);
        }
      } catch (error) {
        console.error("Failed to fetch post:", error);
        if (!cancelled) {
          toast.error("Failed to load post");
          router.replace("/dashboard/posts");
        }
      } finally {
        if (!cancelled) setPostLoading(false);
      }
    };
    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [currentOrganization, postId]);

  // Fetch accounts
  useEffect(() => {
    let cancelled = false;
    const fetchAccounts = async () => {
      if (!currentOrganization) return;
      try {
        const response = await api.get<{
          success: boolean;
          data: SocialAccount[];
        }>(endpoints.accounts.list(currentOrganization.id));
        if (cancelled) return;
        setAccounts(response.data ?? []);
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
        if (!cancelled) toast.error("Failed to load accounts");
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    };
    fetchAccounts();
    return () => {
      cancelled = true;
    };
  }, [currentOrganization]);

  // Fetch Pinterest boards when Pinterest accounts are selected
  useEffect(() => {
    if (!currentOrganization) return;
    const pinterestAccounts = accounts.filter(
      (a) => a.platform === "pinterest" && selectedAccounts.includes(a.id)
    );
    for (const account of pinterestAccounts) {
      if (pinterestBoards[account.id]) continue;
      api
        .get<{ success: boolean; data: Array<{ id: string; name: string }> }>(
          endpoints.accounts.boards(currentOrganization.id, account.id)
        )
        .then((res) => {
          setPinterestBoards((prev) => ({ ...prev, [account.id]: res.data ?? [] }));
        })
        .catch(() => {
          // Silently fail
        });
    }
  }, [selectedAccounts, accounts, currentOrganization]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      newMediaPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const totalMediaCount = existingMediaUrls.length + newMediaFiles.length;

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + totalMediaCount > 10) {
      toast.error("Maximum 10 media files allowed");
      return;
    }

    const previews = files.map((file) => URL.createObjectURL(file));
    setNewMediaFiles((prev) => [...prev, ...files]);
    setNewMediaPreviews((prev) => [...prev, ...previews]);
  };

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewMedia = (index: number) => {
    URL.revokeObjectURL(newMediaPreviews[index]);
    setNewMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setNewMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(accountId)) {
        setSelectedBoards((b) => {
          const next = { ...b };
          delete next[accountId];
          return next;
        });
        return prev.filter((id) => id !== accountId);
      }
      return [...prev, accountId];
    });
  };

  const buildPlatformMetadata = (): Record<string, Record<string, unknown>> | undefined => {
    if (Object.keys(selectedBoards).length === 0) return undefined;
    const metadata: Record<string, Record<string, unknown>> = {};
    for (const [accountId, boardId] of Object.entries(selectedBoards)) {
      metadata[accountId] = { pinterestBoardId: boardId };
    }
    return metadata;
  };

  const uploadNewMedia = async (): Promise<string[]> => {
    if (!currentOrganization || newMediaFiles.length === 0) return [];

    const uploadedUrls: string[] = [];
    for (const file of newMediaFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{
        success: boolean;
        data: { url: string };
      }>(endpoints.media.upload(currentOrganization.id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      uploadedUrls.push(response.data.url);
    }
    return uploadedUrls;
  };

  const handleSaveDraft = async () => {
    if (!currentOrganization) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    const content = form.getValues("content");
    if (!content && totalMediaCount === 0) {
      toast.error("Please add some content or media");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    setLoading(true);
    try {
      const uploadedNewUrls = await uploadNewMedia();
      const mediaUrls = [...existingMediaUrls, ...uploadedNewUrls];

      let scheduledAt: string | undefined;
      if (isScheduling && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const scheduled = new Date(scheduleDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.toISOString();
      }

      await api.put(endpoints.posts.update(currentOrganization.id, postId), {
        content,
        mediaUrls,
        accountIds: selectedAccounts,
        scheduledAt: scheduledAt || null,
        platformMetadata: buildPlatformMetadata(),
      });

      toast.success("Post updated");
      router.push(`/dashboard/posts/${postId}`);
    } catch (error) {
      console.error("Failed to update post:", error);
      toast.error("Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (immediate: boolean = true) => {
    if (!currentOrganization) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    const content = form.getValues("content");
    if (!content && totalMediaCount === 0) {
      toast.error("Please add some content or media");
      return;
    }

    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    if (!immediate && !scheduleDate) {
      toast.error("Please select a schedule date");
      return;
    }

    setLoading(true);
    try {
      const uploadedNewUrls = await uploadNewMedia();
      const mediaUrls = [...existingMediaUrls, ...uploadedNewUrls];

      let scheduledAt: string | undefined;
      if (!immediate && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const scheduled = new Date(scheduleDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.toISOString();
      }

      await api.put(endpoints.posts.update(currentOrganization.id, postId), {
        content,
        mediaUrls,
        accountIds: selectedAccounts,
        scheduledAt: scheduledAt || null,
        platformMetadata: buildPlatformMetadata(),
      });

      if (immediate) {
        await api.post(
          endpoints.posts.publish(currentOrganization.id, postId)
        );
      }

      toast.success(immediate ? "Post published!" : "Post scheduled!");
      router.push(`/dashboard/posts/${postId}`);
    } catch (error) {
      console.error("Failed to publish post:", error);
      toast.error(
        immediate ? "Failed to publish post" : "Failed to schedule post"
      );
    } finally {
      setLoading(false);
    }
  };

  if (postLoading || accountsLoading) {
    return (
      <>
        <Header
          title="Edit Post"
          description="Edit and update your post"
        />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Edit Post"
        description="Edit and update your post"
      />

      <div className="p-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          onClick={() => router.push(`/dashboard/posts/${postId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Post
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Editor */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Content</CardTitle>
                <CardDescription className="text-gray-500">
                  Edit your post caption and media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="content" className="text-gray-800">
                        Caption
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-coral-500 hover:text-coral-600 hover:bg-coral-500/10"
                        onClick={() => router.push("/dashboard/ai")}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate with AI
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="What's on your mind?"
                              className="min-h-32 bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{contentValue.length} characters</span>
                      <span>TikTok: 2200 max | Instagram: 2200 max</span>
                    </div>
                  </div>
                </Form>

                {/* Media Upload */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Media</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Existing media */}
                    {existingMediaUrls.map((url, index) => (
                      <div
                        key={`existing-${index}`}
                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-200"
                      >
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveExistingMedia(index)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {/* New media previews */}
                    {newMediaPreviews.map((preview, index) => (
                      <div
                        key={`new-${index}`}
                        className="relative aspect-square rounded-lg overflow-hidden bg-gray-200"
                      >
                        <img
                          src={preview}
                          alt={`New media ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveNewMedia(index)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {totalMediaCount < 10 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-400">Upload</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleMediaUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Selection */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Post To</CardTitle>
                <CardDescription className="text-gray-500">
                  Select accounts to publish to
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accounts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-3">
                      No accounts connected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-200"
                      onClick={() => router.push("/dashboard/accounts")}
                    >
                      Connect Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div key={account.id}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                          <Checkbox
                            id={account.id}
                            checked={selectedAccounts.includes(account.id)}
                            onCheckedChange={() =>
                              handleAccountToggle(account.id)
                            }
                          />
                          <label
                            htmlFor={account.id}
                            className="flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <PlatformIcon
                              platform={account.platform}
                              size={32}
                              className="rounded-full"
                            />
                            <div>
                              <p className="text-sm text-gray-900">
                                @{account.username}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {account.platform}
                              </p>
                            </div>
                          </label>
                        </div>
                        {account.platform === "pinterest" &&
                          selectedAccounts.includes(account.id) &&
                          pinterestBoards[account.id] && (
                            <div className="ml-10 mt-1 mb-2">
                              <Select
                                value={selectedBoards[account.id] || ""}
                                onValueChange={(value) =>
                                  setSelectedBoards((prev) => ({ ...prev, [account.id]: value }))
                                }
                              >
                                <SelectTrigger className="w-full bg-gray-100 border-gray-300 text-gray-900 text-sm">
                                  <SelectValue placeholder="Select a board" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-gray-200">
                                  {pinterestBoards[account.id].map((board) => (
                                    <SelectItem
                                      key={board.id}
                                      value={board.id}
                                      className="text-gray-900 focus:bg-gray-100"
                                    >
                                      {board.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Schedule</CardTitle>
                <CardDescription className="text-gray-500">
                  When should this post go live?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={!isScheduling ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsScheduling(false)}
                    className={
                      !isScheduling
                        ? "bg-coral-500"
                        : "border-gray-300 text-gray-700"
                    }
                  >
                    Post Now
                  </Button>
                  <Button
                    variant={isScheduling ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsScheduling(true)}
                    className={
                      isScheduling
                        ? "bg-coral-500"
                        : "border-gray-300 text-gray-700"
                    }
                  >
                    Schedule
                  </Button>
                </div>

                {isScheduling && (
                  <div className="space-y-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate
                            ? format(scheduleDate, "PPP")
                            : "Pick a date"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white border-gray-200">
                        <DialogHeader>
                          <DialogTitle className="text-gray-900">
                            Select Date
                          </DialogTitle>
                        </DialogHeader>
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date()}
                          className="rounded-md border border-gray-200"
                        />
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <Select
                        value={scheduleTime}
                        onValueChange={setScheduleTime}
                      >
                        <SelectTrigger className="flex-1 bg-gray-100 border-gray-300 text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, "0");
                            return ["00", "30"].map((minute) => (
                              <SelectItem
                                key={`${hour}:${minute}`}
                                value={`${hour}:${minute}`}
                                className="text-gray-900 focus:bg-gray-100"
                              >
                                {`${hour}:${minute}`}
                              </SelectItem>
                            ));
                          }).flat()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => handlePublish(!isScheduling)}
                disabled={loading}
                className="w-full bg-coral-500 hover:bg-coral-600"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isScheduling ? "Schedule Post" : "Publish Now"}
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={loading}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-200"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

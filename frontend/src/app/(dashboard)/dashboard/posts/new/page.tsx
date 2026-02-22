"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { createPostSchema, type CreatePostFormData } from "@/lib/schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { SocialAccount, Post } from "@/types";
import { api, endpoints } from "@/lib/api";
import { PlatformIcon } from "@/components/ui/platform-icon";

export default function NewPostPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: "" },
  });
  const contentValue = form.watch("content");

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const mediaPreviewsRef = useRef(mediaPreviews);
  mediaPreviewsRef.current = mediaPreviews;
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("12:00");
  const [isScheduling, setIsScheduling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchAccounts = async () => {
      if (!currentOrganization) return;
      try {
        const response = await api.get<{ success: boolean; data: SocialAccount[] }>(
          endpoints.accounts.list(currentOrganization.id)
        );
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
    return () => { cancelled = true; };
  }, [currentOrganization]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      mediaPreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 10) {
      toast.error("Maximum 10 media files allowed");
      return;
    }

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setMediaFiles((prev) => [...prev, ...files]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveMedia = (index: number) => {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (!currentOrganization || mediaFiles.length === 0) return [];

    const uploadedUrls: string[] = [];
    for (const file of mediaFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post<{ success: boolean; data: { url: string } }>(
        endpoints.media.upload(currentOrganization.id),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      uploadedUrls.push(response.data.url);
    }
    return uploadedUrls;
  };

  const handleSaveDraft = async () => {
    if (!currentOrganization) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    const content = form.getValues("content");
    if (!content && mediaFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    setLoading(true);
    try {
      const mediaUrls = await uploadMedia();

      await api.post(
        endpoints.posts.create(currentOrganization.id),
        {
          content,
          mediaUrls,
          accountIds: selectedAccounts,
        }
      );

      toast.success("Draft saved");
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (immediate: boolean = true) => {
    if (!currentOrganization) return;
    const isValid = await form.trigger();
    if (!isValid) return;
    const content = form.getValues("content");
    if (!content && mediaFiles.length === 0) {
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
      const mediaUrls = await uploadMedia();

      let scheduledAt: string | undefined;
      if (!immediate && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number);
        const scheduled = new Date(scheduleDate);
        scheduled.setHours(hours, minutes, 0, 0);
        scheduledAt = scheduled.toISOString();
      }

      const createResponse = await api.post<{ success: boolean; data: Post & { id: string } }>(
        endpoints.posts.create(currentOrganization.id),
        {
          content,
          mediaUrls,
          accountIds: selectedAccounts,
          scheduledAt,
        }
      );

      if (immediate) {
        const postId = createResponse.data.id;
        await api.post(
          endpoints.posts.publish(currentOrganization.id, postId)
        );
      }

      toast.success(immediate ? "Post published!" : "Post scheduled!");
      router.push("/dashboard/posts");
    } catch (error) {
      console.error("Failed to publish post:", error);
      toast.error(immediate ? "Failed to publish post" : "Failed to schedule post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Create Post"
        description="Create and schedule content for your social accounts"
      />

      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content Editor */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Content</CardTitle>
                <CardDescription className="text-slate-400">
                  Write your post caption and add media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="content" className="text-slate-200">Caption</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
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
                              className="min-h-32 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{contentValue.length} characters</span>
                      <span>TikTok: 2200 max | Instagram: 2200 max</span>
                    </div>
                  </div>
                </Form>

                {/* Media Upload */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Media</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-700">
                        <img
                          src={preview}
                          alt={`Media ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {mediaPreviews.length < 10 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-slate-500 transition-colors">
                        <Upload className="h-8 w-8 text-slate-500 mb-2" />
                        <span className="text-xs text-slate-500">Upload</span>
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Post To</CardTitle>
                <CardDescription className="text-slate-400">
                  Select accounts to publish to
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-400 mb-3">No accounts connected</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={() => router.push("/dashboard/accounts")}
                    >
                      Connect Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50"
                      >
                        <Checkbox
                          id={account.id}
                          checked={selectedAccounts.includes(account.id)}
                          onCheckedChange={() => handleAccountToggle(account.id)}
                        />
                        <label
                          htmlFor={account.id}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <PlatformIcon platform={account.platform} size={32} className="rounded-full" />
                          <div>
                            <p className="text-sm text-white">@{account.username}</p>
                            <p className="text-xs text-slate-400 capitalize">{account.platform}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Schedule</CardTitle>
                <CardDescription className="text-slate-400">
                  When should this post go live?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={!isScheduling ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsScheduling(false)}
                    className={!isScheduling ? "bg-blue-600" : "border-slate-600 text-slate-300"}
                  >
                    Post Now
                  </Button>
                  <Button
                    variant={isScheduling ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsScheduling(true)}
                    className={isScheduling ? "bg-blue-600" : "border-slate-600 text-slate-300"}
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
                          className="w-full justify-start border-slate-600 bg-slate-700/50 text-white hover:bg-slate-700"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-800 border-slate-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Select Date</DialogTitle>
                        </DialogHeader>
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date()}
                          className="rounded-md border border-slate-700"
                        />
                      </DialogContent>
                    </Dialog>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <Select value={scheduleTime} onValueChange={setScheduleTime}>
                        <SelectTrigger className="flex-1 bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, "0");
                            return ["00", "30"].map((minute) => (
                              <SelectItem
                                key={`${hour}:${minute}`}
                                value={`${hour}:${minute}`}
                                className="text-white focus:bg-slate-700"
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
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

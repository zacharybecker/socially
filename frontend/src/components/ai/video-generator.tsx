"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Video, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { VideoJob } from "@/types";

export function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const pollingRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRef.current).forEach(clearInterval);
    };
  }, []);

  const pollJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get<{ success: boolean; data: VideoJob }>(
          endpoints.ai.videoJob(jobId)
        );
        const updatedJob = response.data;
        setJobs((prev) =>
          prev.map((j) => (j.id === jobId ? updatedJob : j))
        );

        if (updatedJob.status === "completed" || updatedJob.status === "failed") {
          clearInterval(interval);
          delete pollingRef.current[jobId];
          if (updatedJob.status === "completed") {
            toast.success("Video generation complete!");
          } else {
            toast.error("Video generation failed");
          }
        }
      } catch {
        // Silently retry on network errors
      }
    }, 5000);

    pollingRef.current[jobId] = interval;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: VideoJob }>(
        endpoints.ai.generateVideo,
        { prompt, aspectRatio }
      );
      const job = response.data;
      setJobs((prev) => [job, ...prev]);
      toast.success("Video generation started!");
      pollJob(job.id);
    } catch {
      toast.error("Failed to start video generation");
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: VideoJob["status"]) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-600/20 text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge className="bg-blue-600/20 text-blue-400"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge className="bg-green-600/20 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge className="bg-red-600/20 text-red-400"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Generate Video</CardTitle>
          <CardDescription className="text-slate-400">
            Create AI-generated videos from text prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Prompt</Label>
            <Textarea
              placeholder="Describe the video you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-24 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="16:9" className="text-white">16:9 (Landscape)</SelectItem>
                <SelectItem value="9:16" className="text-white">9:16 (Portrait / Stories)</SelectItem>
                <SelectItem value="1:1" className="text-white">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Video className="mr-2 h-4 w-4" />
            )}
            Generate Video
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Video Jobs</CardTitle>
          <CardDescription className="text-slate-400">
            Track your video generation progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Your video jobs will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="p-4 rounded-lg bg-slate-700/50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {statusBadge(job.status)}
                    {job.aspectRatio && (
                      <span className="text-xs text-slate-400">{job.aspectRatio}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300 mb-2 line-clamp-2">{job.prompt}</p>
                  {job.status === "completed" && job.resultUrl && (
                    <video
                      src={job.resultUrl}
                      controls
                      className="w-full rounded-lg mt-2"
                    />
                  )}
                  {job.status === "failed" && job.errorMessage && (
                    <p className="text-xs text-red-400 mt-1">{job.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

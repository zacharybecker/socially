"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { CaptionVariation, Platform } from "@/types";

export function CaptionVariations() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [variations, setVariations] = useState<CaptionVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: { variations: CaptionVariation[] } }>(
        endpoints.ai.generateCaptionVariations,
        { topic, platform }
      );
      setVariations(response.data?.variations ?? []);
    } catch {
      toast.error("Failed to generate caption variations");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Caption Variations</CardTitle>
          <CardDescription className="text-slate-400">
            Generate multiple caption options for your post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Topic</Label>
            <Input
              placeholder="What is your post about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-slate-700/50 border-slate-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="instagram" className="text-white">Instagram</SelectItem>
                <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
                <SelectItem value="twitter" className="text-white">Twitter / X</SelectItem>
                <SelectItem value="facebook" className="text-white">Facebook</SelectItem>
                <SelectItem value="linkedin" className="text-white">LinkedIn</SelectItem>
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
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            Generate Variations
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Variations</CardTitle>
          <CardDescription className="text-slate-400">
            Compare and pick your favorite
          </CardDescription>
        </CardHeader>
        <CardContent>
          {variations.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Caption variations will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {variations.map((variation, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge className="bg-blue-600/20 text-blue-400 text-xs capitalize">
                      {variation.tone}
                    </Badge>
                    <button
                      onClick={() => handleCopy(variation.caption, index)}
                      className="p-1 rounded hover:bg-slate-600 transition-colors"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-white whitespace-pre-wrap">{variation.caption}</p>
                  {variation.hashtags && variation.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {variation.hashtags.map((tag) => (
                        <span key={tag} className="text-xs text-blue-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
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

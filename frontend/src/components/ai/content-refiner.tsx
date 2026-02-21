"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, Loader2, RefreshCw, Minimize2, Maximize2, Mic } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { RefineContentInput } from "@/types";

interface ContentRefinerProps {
  initialContent?: string;
  onUseContent?: (content: string) => void;
}

export function ContentRefiner({ initialContent = "", onUseContent }: ContentRefinerProps) {
  const [content, setContent] = useState(initialContent);
  const [action, setAction] = useState<RefineContentInput["action"]>("rewrite");
  const [tone, setTone] = useState<string>("professional");
  const [useBrandVoice, setUseBrandVoice] = useState(false);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRefine = async () => {
    if (!content.trim()) {
      toast.error("Please enter content to refine");
      return;
    }

    setLoading(true);
    try {
      const payload: RefineContentInput = {
        content,
        action,
        useBrandVoice,
      };
      if (action === "change_tone") {
        payload.tone = tone as RefineContentInput["tone"];
      }

      const response = await api.post<{ success: boolean; data: { content: string } }>(
        endpoints.ai.refineContent,
        payload
      );
      setResult(response.data?.content ?? "");
    } catch {
      toast.error("Failed to refine content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Refine Content</CardTitle>
          <CardDescription className="text-slate-400">
            Rewrite, shorten, expand, or change tone of your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-200">Content</Label>
            <Textarea
              placeholder="Paste your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-32 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-200">Action</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "rewrite" as const, label: "Rewrite", icon: RefreshCw },
                { value: "shorten" as const, label: "Shorten", icon: Minimize2 },
                { value: "expand" as const, label: "Expand", icon: Maximize2 },
                { value: "change_tone" as const, label: "Change Tone", icon: Mic },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setAction(value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-colors ${
                    action === value
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {action === "change_tone" && (
            <div className="space-y-2">
              <Label className="text-slate-200">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="professional" className="text-white">Professional</SelectItem>
                  <SelectItem value="casual" className="text-white">Casual</SelectItem>
                  <SelectItem value="humorous" className="text-white">Humorous</SelectItem>
                  <SelectItem value="dramatic" className="text-white">Dramatic</SelectItem>
                  <SelectItem value="inspirational" className="text-white">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="brandVoice"
              checked={useBrandVoice}
              onCheckedChange={(checked) => setUseBrandVoice(checked === true)}
            />
            <label htmlFor="brandVoice" className="text-sm text-slate-300 cursor-pointer">
              Use Brand Voice
            </label>
          </div>

          <Button
            onClick={handleRefine}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refine Content
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Refined Content</CardTitle>
              <CardDescription className="text-slate-400">
                Your improved content
              </CardDescription>
            </div>
            {result && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Refined content will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={result}
                readOnly
                className="min-h-48 bg-slate-700/50 border-slate-600 text-white font-mono text-sm resize-none"
              />
              {onUseContent && (
                <Button
                  onClick={() => onUseContent(result)}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  Use This Content
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

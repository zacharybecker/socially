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
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Refine Content</CardTitle>
          <CardDescription className="text-gray-500">
            Rewrite, shorten, expand, or change tone of your content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-800">Content</Label>
            <Textarea
              placeholder="Paste your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-32 bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-800">Action</Label>
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
                      ? "bg-coral-500/10 text-coral-500 border border-coral-500/30"
                      : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
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
              <Label className="text-gray-800">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="professional" className="text-gray-900">Professional</SelectItem>
                  <SelectItem value="casual" className="text-gray-900">Casual</SelectItem>
                  <SelectItem value="humorous" className="text-gray-900">Humorous</SelectItem>
                  <SelectItem value="dramatic" className="text-gray-900">Dramatic</SelectItem>
                  <SelectItem value="inspirational" className="text-gray-900">Inspirational</SelectItem>
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
            <label htmlFor="brandVoice" className="text-sm text-gray-700 cursor-pointer">
              Use Brand Voice
            </label>
          </div>

          <Button
            onClick={handleRefine}
            disabled={loading}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white"
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

      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Refined Content</CardTitle>
              <CardDescription className="text-gray-500">
                Your improved content
              </CardDescription>
            </div>
            {result && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-gray-900"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Refined content will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={result}
                readOnly
                className="min-h-48 bg-gray-100 border-gray-300 text-gray-900 font-mono text-sm resize-none"
              />
              {onUseContent && (
                <Button
                  onClick={() => onUseContent(result)}
                  className="w-full bg-coral-500 hover:bg-coral-600 text-white"
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

"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Lightbulb, MessageSquare, Sparkles, Video, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";

export default function AIStudioPage() {
  const [hookTopic, setHookTopic] = useState("");
  const [hookTone, setHookTone] = useState("casual");
  const [hooks, setHooks] = useState<string[]>([]);
  const [hookLoading, setHookLoading] = useState(false);
  const [hookError, setHookError] = useState<string | null>(null);

  const [captionTopic, setCaptionTopic] = useState("");
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [captionTone, setCaptionTone] = useState("casual");
  const [captions, setCaptions] = useState<string[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);

  const [ideaNiche, setIdeaNiche] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  const [scriptTopic, setScriptTopic] = useState("");
  const [scriptDuration, setScriptDuration] = useState("30s");
  const [script, setScript] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generateHooks = async () => {
    if (!hookTopic) {
      toast.error("Please enter a topic");
      return;
    }
    setHookLoading(true);
    setHookError(null);
    try {
      const response = await api.post<{ success: boolean; data: { hooks: string[] } }>(
        endpoints.ai.generateHook,
        {
          topic: hookTopic,
          tone: hookTone,
          count: 5,
        }
      );
      setHooks(response.data?.hooks ?? []);
    } catch (error) {
      console.error("Failed to generate hooks:", error);
      setHookError("We couldn't generate hooks right now. Please try again.");
      toast.error("Failed to generate hooks");
    } finally {
      setHookLoading(false);
    }
  };

  const generateCaptions = async () => {
    if (!captionTopic) {
      toast.error("Please enter a topic");
      return;
    }
    setCaptionLoading(true);
    setCaptionError(null);
    try {
      const response = await api.post<{ success: boolean; data: { captions: string[] } }>(
        endpoints.ai.generateCaption,
        {
          topic: captionTopic,
          platform: captionPlatform,
          tone: captionTone,
          includeHashtags: true,
          maxLength: 2200,
        }
      );
      setCaptions(response.data?.captions ?? []);
    } catch (error) {
      console.error("Failed to generate captions:", error);
      setCaptionError("We couldn't generate captions right now. Please try again.");
      toast.error("Failed to generate captions");
    } finally {
      setCaptionLoading(false);
    }
  };

  const generateIdeas = async () => {
    if (!ideaNiche) {
      toast.error("Please enter your niche");
      return;
    }
    setIdeaLoading(true);
    setIdeaError(null);
    try {
      const response = await api.post<{ success: boolean; data: { ideas: string[] } }>(
        endpoints.ai.generateIdeas,
        {
          niche: ideaNiche,
          count: 8,
        }
      );
      setIdeas(response.data?.ideas ?? []);
    } catch (error) {
      console.error("Failed to generate ideas:", error);
      setIdeaError("We couldn't generate ideas right now. Please try again.");
      toast.error("Failed to generate ideas");
    } finally {
      setIdeaLoading(false);
    }
  };

  const generateScript = async () => {
    if (!scriptTopic) {
      toast.error("Please enter a topic");
      return;
    }
    setScriptLoading(true);
    setScriptError(null);
    try {
      const response = await api.post<{ success: boolean; data: { script: string } }>(
        endpoints.ai.generateScript,
        {
          topic: scriptTopic,
          duration: scriptDuration,
        }
      );
      setScript(response.data?.script ?? "");
    } catch (error) {
      console.error("Failed to generate script:", error);
      setScriptError("We couldn't generate a script right now. Please try again.");
      toast.error("Failed to generate script");
    } finally {
      setScriptLoading(false);
    }
  };

  return (
    <>
      <Header
        title="AI Studio"
        description="Generate hooks, captions, ideas, and scripts with AI"
      />

      <div className="p-6">
        <Tabs defaultValue="hooks">
          <TabsList className="bg-slate-800 border-slate-700 mb-6">
            <TabsTrigger value="hooks" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Sparkles className="h-4 w-4" />
              Hooks
            </TabsTrigger>
            <TabsTrigger value="captions" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <MessageSquare className="h-4 w-4" />
              Captions
            </TabsTrigger>
            <TabsTrigger value="ideas" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Lightbulb className="h-4 w-4" />
              Ideas
            </TabsTrigger>
            <TabsTrigger value="scripts" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Video className="h-4 w-4" />
              Scripts
            </TabsTrigger>
          </TabsList>

          {/* Hooks Tab */}
          <TabsContent value="hooks">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generate Hooks</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create attention-grabbing opening lines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Topic</Label>
                    <Input
                      placeholder="e.g., productivity, fitness, cooking..."
                      value={hookTopic}
                      onChange={(e) => setHookTopic(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Tone</Label>
                    <Select value={hookTone} onValueChange={setHookTone}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="casual" className="text-white">Casual</SelectItem>
                        <SelectItem value="professional" className="text-white">Professional</SelectItem>
                        <SelectItem value="humorous" className="text-white">Humorous</SelectItem>
                        <SelectItem value="dramatic" className="text-white">Dramatic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={generateHooks}
                    disabled={hookLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {hookLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate Hooks
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generated Hooks</CardTitle>
                  <CardDescription className="text-slate-400">
                    Click to copy any hook
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hooks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Your generated hooks will appear here</p>
                      {hookError && <p className="text-sm text-rose-400 mt-2">{hookError}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hooks.map((hook, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer group"
                          onClick={() => handleCopy(hook, index)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-white">{hook}</p>
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <Copy className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Captions Tab */}
          <TabsContent value="captions">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generate Captions</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create engaging captions with hashtags
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Topic</Label>
                    <Input
                      placeholder="What is your post about?"
                      value={captionTopic}
                      onChange={(e) => setCaptionTopic(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Platform</Label>
                      <Select value={captionPlatform} onValueChange={setCaptionPlatform}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="instagram" className="text-white">Instagram</SelectItem>
                          <SelectItem value="tiktok" className="text-white">TikTok</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-200">Tone</Label>
                      <Select value={captionTone} onValueChange={setCaptionTone}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="casual" className="text-white">Casual</SelectItem>
                          <SelectItem value="professional" className="text-white">Professional</SelectItem>
                          <SelectItem value="humorous" className="text-white">Humorous</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={generateCaptions}
                    disabled={captionLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {captionLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="mr-2 h-4 w-4" />
                    )}
                    Generate Captions
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generated Captions</CardTitle>
                </CardHeader>
                <CardContent>
                  {captions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Your generated captions will appear here</p>
                      {captionError && <p className="text-sm text-rose-400 mt-2">{captionError}</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {captions.map((caption, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer group"
                          onClick={() => handleCopy(caption, index + 100)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-white whitespace-pre-wrap">{caption}</p>
                            {copiedIndex === index + 100 ? (
                              <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <Copy className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ideas Tab */}
          <TabsContent value="ideas">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generate Content Ideas</CardTitle>
                  <CardDescription className="text-slate-400">
                    Get inspiration for your next video
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Your Niche</Label>
                    <Input
                      placeholder="e.g., tech reviews, fitness, cooking..."
                      value={ideaNiche}
                      onChange={(e) => setIdeaNiche(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={generateIdeas}
                    disabled={ideaLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {ideaLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="mr-2 h-4 w-4" />
                    )}
                    Generate Ideas
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Content Ideas</CardTitle>
                </CardHeader>
                <CardContent>
                  {ideas.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Your content ideas will appear here</p>
                      {ideaError && <p className="text-sm text-rose-400 mt-2">{ideaError}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ideas.map((idea, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 cursor-pointer group flex items-center justify-between"
                          onClick={() => handleCopy(idea, index + 200)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-600/20 text-blue-400">{index + 1}</Badge>
                            <p className="text-sm text-white">{idea}</p>
                          </div>
                          {copiedIndex === index + 200 ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Scripts Tab */}
          <TabsContent value="scripts">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Generate Video Script</CardTitle>
                  <CardDescription className="text-slate-400">
                    Create a structured script for your video
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Topic</Label>
                    <Input
                      placeholder="What is your video about?"
                      value={scriptTopic}
                      onChange={(e) => setScriptTopic(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Duration</Label>
                    <Select value={scriptDuration} onValueChange={setScriptDuration}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="15s" className="text-white">15 seconds</SelectItem>
                        <SelectItem value="30s" className="text-white">30 seconds</SelectItem>
                        <SelectItem value="60s" className="text-white">60 seconds</SelectItem>
                        <SelectItem value="90s" className="text-white">90 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={generateScript}
                    disabled={scriptLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {scriptLoading ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Video className="mr-2 h-4 w-4" />
                    )}
                    Generate Script
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">Generated Script</CardTitle>
                      <CardDescription className="text-slate-400">
                        Your video script with timestamps
                      </CardDescription>
                    </div>
                    {script && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(script, 300)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedIndex === 300 ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {!script ? (
                    <div className="text-center py-8 text-slate-400">
                      <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Your script will appear here</p>
                      {scriptError && <p className="text-sm text-rose-400 mt-2">{scriptError}</p>}
                    </div>
                  ) : (
                    <Textarea
                      value={script}
                      readOnly
                      className="min-h-64 bg-slate-700/50 border-slate-600 text-white font-mono text-sm"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

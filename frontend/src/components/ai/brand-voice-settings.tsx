"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Sparkles, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { useOrganization } from "@/lib/hooks";
import { BrandVoice } from "@/types";

export function BrandVoiceSettings() {
  const { currentOrganization } = useOrganization();
  const [guidelines, setGuidelines] = useState("");
  const [tone, setTone] = useState("");
  const [keyPhrases, setKeyPhrases] = useState<string[]>([]);
  const [avoidPhrases, setAvoidPhrases] = useState<string[]>([]);
  const [sampleContent, setSampleContent] = useState<string[]>([]);
  const [newKeyPhrase, setNewKeyPhrase] = useState("");
  const [newAvoidPhrase, setNewAvoidPhrase] = useState("");
  const [newSample, setNewSample] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingVoice, setLoadingVoice] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchVoice = async () => {
      if (!currentOrganization) return;
      try {
        const response = await api.get<{ success: boolean; data: BrandVoice }>(
          endpoints.brandVoice.get(currentOrganization.id)
        );
        if (cancelled) return;
        const voice = response.data;
        if (voice) {
          setGuidelines(voice.guidelines || "");
          setTone(voice.tone || "");
          setKeyPhrases(voice.keyPhrases || []);
          setAvoidPhrases(voice.avoidPhrases || []);
          setSampleContent(voice.sampleContent || []);
        }
      } catch {
        // No brand voice yet, use defaults
      } finally {
        if (!cancelled) setLoadingVoice(false);
      }
    };
    fetchVoice();
    return () => { cancelled = true; };
  }, [currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      await api.put(endpoints.brandVoice.update(currentOrganization.id), {
        guidelines,
        tone,
        keyPhrases,
        avoidPhrases,
        sampleContent,
      });
      toast.success("Brand voice saved");
    } catch {
      toast.error("Failed to save brand voice");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!currentOrganization) return;
    if (sampleContent.length === 0) {
      toast.error("Add some sample content first");
      return;
    }
    setAnalyzing(true);
    try {
      const response = await api.post<{ success: boolean; data: BrandVoice }>(
        endpoints.brandVoice.analyze(currentOrganization.id),
        { sampleContent }
      );
      const result = response.data;
      if (result) {
        setGuidelines(result.guidelines || guidelines);
        setTone(result.tone || tone);
        setKeyPhrases(result.keyPhrases || keyPhrases);
        setAvoidPhrases(result.avoidPhrases || avoidPhrases);
        toast.success("Brand voice analyzed from samples");
      }
    } catch {
      toast.error("Failed to analyze brand voice");
    } finally {
      setAnalyzing(false);
    }
  };

  const addTag = (value: string, list: string[], setList: (v: string[]) => void, reset: () => void) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return;
    setList([...list, trimmed]);
    reset();
  };

  if (loadingVoice) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Brand Voice Configuration</CardTitle>
          <CardDescription className="text-gray-500">
            Define your brand&apos;s voice and AI will match it when generating content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-gray-800">Brand Guidelines</Label>
            <Textarea
              placeholder="Describe your brand's personality, values, and communication style..."
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              className="min-h-24 bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-800">Tone</Label>
            <Input
              placeholder="e.g., friendly, professional, witty, authoritative"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-gray-100 border-gray-300 text-gray-900"
            />
          </div>

          {/* Key Phrases */}
          <div className="space-y-2">
            <Label className="text-gray-800">Key Phrases</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a key phrase..."
                value={newKeyPhrase}
                onChange={(e) => setNewKeyPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newKeyPhrase, keyPhrases, setKeyPhrases, () => setNewKeyPhrase(""));
                  }
                }}
                className="bg-gray-100 border-gray-300 text-gray-900"
              />
              <Button
                variant="outline"
                size="icon"
                className="border-gray-300 text-gray-700 hover:bg-gray-200 flex-shrink-0"
                onClick={() => addTag(newKeyPhrase, keyPhrases, setKeyPhrases, () => setNewKeyPhrase(""))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keyPhrases.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keyPhrases.map((phrase) => (
                  <Badge key={phrase} className="bg-coral-500/10 text-coral-500 gap-1">
                    {phrase}
                    <button onClick={() => setKeyPhrases(keyPhrases.filter((p) => p !== phrase))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Avoid Phrases */}
          <div className="space-y-2">
            <Label className="text-gray-800">Avoid Phrases</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a phrase to avoid..."
                value={newAvoidPhrase}
                onChange={(e) => setNewAvoidPhrase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newAvoidPhrase, avoidPhrases, setAvoidPhrases, () => setNewAvoidPhrase(""));
                  }
                }}
                className="bg-gray-100 border-gray-300 text-gray-900"
              />
              <Button
                variant="outline"
                size="icon"
                className="border-gray-300 text-gray-700 hover:bg-gray-200 flex-shrink-0"
                onClick={() => addTag(newAvoidPhrase, avoidPhrases, setAvoidPhrases, () => setNewAvoidPhrase(""))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {avoidPhrases.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {avoidPhrases.map((phrase) => (
                  <Badge key={phrase} className="bg-red-600/20 text-red-400 gap-1">
                    {phrase}
                    <button onClick={() => setAvoidPhrases(avoidPhrases.filter((p) => p !== phrase))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Sample Content */}
          <div className="space-y-2">
            <Label className="text-gray-800">Sample Content</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a sample post or caption..."
                value={newSample}
                onChange={(e) => setNewSample(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newSample, sampleContent, setSampleContent, () => setNewSample(""));
                  }
                }}
                className="bg-gray-100 border-gray-300 text-gray-900"
              />
              <Button
                variant="outline"
                size="icon"
                className="border-gray-300 text-gray-700 hover:bg-gray-200 flex-shrink-0"
                onClick={() => addTag(newSample, sampleContent, setSampleContent, () => setNewSample(""))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {sampleContent.length > 0 && (
              <div className="space-y-2 mt-2">
                {sampleContent.map((sample, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gray-100">
                    <p className="text-sm text-gray-700 flex-1">{sample}</p>
                    <button
                      onClick={() => setSampleContent(sampleContent.filter((_, idx) => idx !== i))}
                      className="p-1 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-coral-500 hover:bg-coral-600 text-white"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Brand Voice
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || sampleContent.length === 0}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-200"
            >
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Analyze Samples
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

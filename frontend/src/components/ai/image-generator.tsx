"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImageIcon, Download } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { GenerateImageInput } from "@/types";

interface ImageGeneratorProps {
  onUseImage?: (url: string) => void;
}

interface GeneratedImage {
  url: string;
  prompt: string;
}

export function ImageGenerator({ onUseImage }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<GenerateImageInput["size"]>("1024x1024");
  const [style, setStyle] = useState<GenerateImageInput["style"]>("vivid");
  const [quality, setQuality] = useState<GenerateImageInput["quality"]>("standard");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: { url: string } }>(
        endpoints.ai.generateImage,
        { prompt, size, style, quality }
      );
      const url = response.data?.url;
      if (url) {
        setImages((prev) => [{ url, prompt }, ...prev]);
        toast.success("Image generated!");
      }
    } catch {
      toast.error("Failed to generate image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Generate Image</CardTitle>
          <CardDescription className="text-gray-500">
            Create images with AI using DALL-E 3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-800">Prompt</Label>
            <Textarea
              placeholder="Describe the image you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-24 bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-gray-800">Size</Label>
              <Select value={size} onValueChange={(v) => setSize(v as GenerateImageInput["size"])}>
                <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="1024x1024" className="text-gray-900">Square</SelectItem>
                  <SelectItem value="1792x1024" className="text-gray-900">Landscape</SelectItem>
                  <SelectItem value="1024x1792" className="text-gray-900">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800">Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as GenerateImageInput["style"])}>
                <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="vivid" className="text-gray-900">Vivid</SelectItem>
                  <SelectItem value="natural" className="text-gray-900">Natural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-800">Quality</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as GenerateImageInput["quality"])}>
                <SelectTrigger className="bg-gray-100 border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="standard" className="text-gray-900">Standard</SelectItem>
                  <SelectItem value="hd" className="text-gray-900">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {loading ? "Generating..." : "Generate Image"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Generated Images</CardTitle>
          <CardDescription className="text-gray-500">
            {images.length} image{images.length !== 1 ? "s" : ""} generated
          </CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Generated images will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group rounded-lg overflow-hidden bg-gray-200">
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {onUseImage && (
                      <Button
                        size="sm"
                        className="bg-coral-500 hover:bg-coral-600 text-white"
                        onClick={() => onUseImage(image.url)}
                      >
                        Use in Post
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-300 text-white hover:bg-gray-200"
                      onClick={() => window.open(image.url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

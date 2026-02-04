---
name: "AI Media: Generate video/image content"
about: "Add AI-generated video and image content from prompts."
title: "Add AI-generated video and image content"
labels: ["enhancement", "ai", "media", "backend", "frontend"]
---

## Description
Add the ability to generate video and/or image content with AI (e.g. DALL-E, or a video API) from prompts. Include backend endpoint(s), optional storage of generated assets, and UI in the post composer or AI Studio to trigger generation and attach to posts.

## Acceptance Criteria
- [ ] Backend endpoint(s) to request AI image/video generation from prompts.
- [ ] Optional storage for generated assets (persist URLs/metadata).
- [ ] UI entry point in post composer or AI Studio to generate and attach assets.
- [ ] Audit/usage logging and error handling.

## Notes
- Evaluate providers (e.g. DALL-E for images, a video API for clips) for cost/latency.

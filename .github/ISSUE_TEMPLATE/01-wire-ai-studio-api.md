---
name: "AI Studio: Wire hooks/captions/ideas/scripts to API"
about: "Replace AI Studio mock data with real backend API calls."
title: "Wire AI Studio (hooks, captions, ideas, scripts) to backend API"
labels: ["enhancement", "ai", "frontend", "backend"]
---

## Description
AI Studio page (`dashboard/ai`) currently uses mock data (`setTimeout`). Replace with real calls to existing backend endpoints using `api` and `endpoints.ai` so hooks, captions, ideas, and scripts are generated via OpenAI.

## Acceptance Criteria
- [ ] Replace mocked `setTimeout` data with API calls via `api` and `endpoints.ai`.
- [ ] Hooks, captions, ideas, and scripts render from backend responses.
- [ ] Loading/error states handled gracefully.
- [ ] Remove any unused mock helpers once API integration is complete.

## Notes
- Confirm endpoint response shapes for each AI generation type before wiring UI.

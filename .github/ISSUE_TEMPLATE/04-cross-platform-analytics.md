---
name: "Analytics: Cross-platform API + UI"
about: "Aggregate and display analytics from TikTok/Instagram."
title: "Implement cross-platform analytics (API + UI data)"
labels: ["enhancement", "analytics", "backend", "frontend"]
---

## Description
Add backend analytics routes (e.g. overview, posts, accounts) that aggregate metrics from TikTok and Instagram (and any future platforms) using each platform’s APIs.

Persist or cache metrics as needed (e.g. Firestore or cache layer).

Wire the existing Analytics dashboard UI to these APIs so it shows real views, likes, comments, shares, followers, and engagement over time (replace placeholder “No data available” states).

## Acceptance Criteria
- [ ] New analytics endpoints (overview/posts/accounts) aggregate platform metrics.
- [ ] Metrics are cached/persisted for performance and historical views.
- [ ] Analytics UI consumes real data (no placeholder states).
- [ ] Coverage for views/likes/comments/shares/followers/engagement.

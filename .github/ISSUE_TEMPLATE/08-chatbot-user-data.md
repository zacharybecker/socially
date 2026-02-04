---
name: "AI: Chatbot with user data context"
about: "Add a chatbot that answers questions using user data."
title: "Built-in chatbot with access to user data for prioritization"
labels: ["enhancement", "ai", "backend", "frontend"]
---

## Description
Add a chatbot (e.g. in dashboard or sidebar) that can answer questions about the user’s accounts, posts, and analytics.

Give the chatbot context from user data (organizations, connected accounts, post history, analytics) via a secure backend endpoint (e.g. RAG or structured context) so it can suggest what to prioritize (e.g. “Which account needs content?”, “What performed best this week?”).

Ensure only the current user’s data is exposed and that usage is scoped per org if applicable.

## Acceptance Criteria
- [ ] Chat UI available in dashboard or sidebar.
- [ ] Backend context endpoint secured per user/org.
- [ ] Responses limited to user’s authorized data.
- [ ] Guidance on prioritization included in responses.

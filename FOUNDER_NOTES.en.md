# Founder Notes — Zimb(.app)

Zimb(.app) is a ticket management platform designed as a Kanban board coupled with a user-facing ticket creation form. It connects junior developers (predominantly "vibe coders") with senior developers who possess the expertise to unblock typical errors caused or exacerbated by AI code generation. The system operates on a bounty model: user requests have a price set by the requester, an allotted resolution SLA, and a precise problem description. Senior developers access the Kanban board to claim tickets, which they must resolve within the allotted timeframe.

The core application data store is Airtable.

## Architecture and Phased Rollout

### Phase 1: Flutter Web App
Develop a Flutter web application hosted on `app.zimb.app` via Cloudflare. This application functions as a ticket selector formatted as urgent-colored sticky notes with swipe and scroll capabilities. Users click a ticket to view full details. Senior developers use this interface to claim tickets. Claimed tickets become invisible to other users immediately. Concurrency must be handled strictly on conflicting claims (first valid timestamp wins). If the senior fails to deliver a solution within the allotted resolution window, the requester can re-open the ticket for another contributor.

### Phase 2: VS Code Copilot Extension
Develop a GitHub Copilot extension for VS Code providing an `@zimb` chat participant. Calling the participant in chat inspects the workspace, collects language statistics, links the relevant GitHub repository, and creates a structured ticket. For example:
`@zimb -u fix the HTTP request error causing systematic CORS failures on api.zimb.app`
This triggers automated GitHub API workflows: private repository access provisioning, branch creation, and automated permission revocation upon completion.

Calling `@zimb` or `@zimb-app` initializes a conversational agent that inspects the issue, compiles technical metadata, and extracts discarded approaches from chat history to narrow down root causes. The ticket is published as a GitHub Issue for immediate visibility. The retrieval workflow features an in-editor banner notification alerting senior developers to new issues; clicking the banner claims the ticket, grants repository access, and assigns the user. Using GitHub-native mechanisms provides an independent, functional core for the initial version.

### Phase 3: Marketing and Recruitment Landing Page
Deploy a landing page hosted at `zimb.app` to present the service and recruit senior developer talent.

## Financial and Dispute Mechanics
Stripe Connect guarantees fund availability upon ticket creation using payment pre-authorizations (`capture_method: manual`).
Disputes are handled by peer tutors and reviewers.
Zimb retains a 20% platform commission on settled bounties. In disputed cases, the assigned reviewer receives this commission for providing arbitration.
Requesters can click "Quick Win!" to validate delivery immediately and trigger fund capture/transfer. Tickets automatically settle after 24 hours of client inactivity following delivery.
An orchestrator service bridges the VS Code extension, Airtable API, GitHub webhooks, and Stripe Connect.

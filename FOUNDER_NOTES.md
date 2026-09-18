# Founder Notes / Notes du Fondateur

> **English translation followed by the original French version.**  
> *Translated for the Zimb open-source team and contributors.*

---

## 🇬🇧 English Translation

Zimb (.app) is a ticket management platform designed as a Kanban board paired with a user-side ticket creation form. It bridges the gap between junior developers (often "vibe coders" boosted by AI tools) and experienced senior developers who know how to unblock typical bugs introduced by AI.

The platform operates on a **Bounty system**: user requests are published with a price set by the requester, a designated resolution time window (SLA), and a precise description of what needs to be fixed. Senior developers access the Kanban, claim a ticket, and attempt to resolve it within the allotted timeframe.

### Key Architectural Pillars:

1. **Database & Storage:**
   The initial implementation uses Airtable as the primary database backend.

2. **Senior Developer Interface (Web App):**
   Initially planned as a Flutter web app hosted at `app.zimb.app` via Cloudflare Pages. This acts as a ticket browser styled like sticky post-it notes, color-coded by urgency, supporting swipe and scroll gestures. Clicking a ticket reveals full details. Seniors use it to accept/claim tickets. Once claimed, a ticket becomes invisible to others. Concurrency must be strictly handled (timestamp-based first-come first-served) to prevent race conditions when two seniors attempt to claim simultaneously. If a senior fails to deliver within the SLA, the requester can reopen the ticket to another developer.

3. **User Interface (VS Code Copilot Extension):**
   A Copilot chat extension for VS Code introducing an `@zimb` chat participant. Calling `@zimb` sends a request that creates a ticket with essential tags (language breakdown of the workspace code, GitHub repository link). Example: `@zimb -u fix the HTTP request error giving me persistent CORS issues on api.zimb.app`. GitHub API automations handle private repo creation, automated access grants/revocations, and automated branch creation (`zimb/<ticketId>`).

4. **Chat-Driven Issue Creation Flow:**
   Starting a prompt with `@zimb` or `@zimb-app` invokes a conversational agent that analyzes the problem and authors a comprehensive ticket detailing the tech stack, ruled-out debug attempts, and the pinpointed root problem. The ticket is published to GitHub Issues. Future enhancement: an in-IDE banner/notification in VS Code when a new issue is posted, allowing a senior to click and claim immediately with access granted. For v1, keeping the core loop native to GitHub (Issues + `@zimb-bot`) provides a solid, independent foundation.

5. **Landing Page:**
   Hosted at `zimb.app` to present the service, explain the value proposition, and recruit senior developers.

6. **Payment & Dispute Resolution (Stripe Connect):**
   Stripe Connect guarantees funds are pre-authorized (held in escrow) when the ticket is created, ensuring guaranteed payout upon verified completion. A 20% platform commission is collected. If disputes arise, senior peer reviewers handle arbitration (earning the platform commission). Requesters can click "Quick Win!" to immediately approve payout, or tickets auto-close and release payout after 24 hours without dispute.

7. **Orchestrator Middleware:**
   A Cloudflare Worker middleware orchestrates interactions between the VS Code extension, Airtable API, GitHub webhooks, and Stripe Connect.

---

## 🇫🇷 Version Originale (Français)

Zimb(.app) est un gestionnaire de ticket sous la forme d'un kanban couplé à un formulaire de création de ticket côté utilisateur. Il connecte d'un côté principalement les nouveaux juniors (souvent des vibe coder) et de l'autre les seniors, qui savent débloquer les problèmes typiques causé par l'ia. Le système est fondé sur un système de Bounty, donc des requêtes utilisateurs à un prix fixé par le demandeur, avec un temps de résolution de ticket, ainsi que la description précise de ce qui doit être résolu. Le senior à accès au kanban et peut claim un ticket, et doit essayer de le résoudre dans le temps imparti. 

L'application utilisera essentiellement airtable.  

On doit dans un premier temps créer une web app flutter, qui sera hebergé sur app.zimb.app via cloudfare. Celle ci est un selecteur de ticket, sous forme de post-it, coloré par urgence, avec swipe et scroll. on peut cliquer sur le ticket pour avoir plus de détail eventuellement. Elle servira aux seniors pour accepter les tickets. les tickets qui ont été claim deviennent invisible pour les autres utilisateurs, il faudra faire attention a la concurrence lorsque deux tickets sont pris en meme temps (le premier sur le timestamp). si le senior n'a pas livré de solution dans le temps imparti, le demandeur peut demander un autre intervenant. 

Dans un deuxième temps créer une extension copilot pour vs code, qui crée un agent qu'on peut appeler avec une arobase, dans le chat, qui enverra une requête et créera un ticket avec les tags essentiels (répartion du langage utilisé dans le code), lien vers le github, Par exemple @Zimb -u corrige moi l'erreur dans la requete http qui me renvoit un cors systématique sur api.zimb.app. Il y automatisation github api, vers le depot privé et révocation automatique de l'accès et eventuellement la création d'une branche via @zimb.

Je lance l'app dans le chat avec @zimb ou @zimb-app, cela devrait créer un ticket à partir d'un agent conversationnel qui étudie le problème et rédige un ticket complet avec aussi la techno qui est utilisée etc... et les élements dans le chat qui permet de cibler les pistes déja écartés et le noeud du problème déja précisé apres le @zimb [probleme], le ticket est visible dans issue (pour le moment). puis on fera la partie récupération. Idéalement ce serait bien une bannière qui pop dans vs code avec une nouvelle issue, le lien vers l'issue quand on clique dessus claim, donc l'accès est grant sur l'issue puis il faudrait trouver le moyen de l'assigner a celui qui a cliquer sur la bannière. Pour l'instant un fonctionnement interne a github me semble une bonne idée pour avoir une première brique fonctionnelle et indépendante.

Dans un troisième temps une landing page, qui sera hebergé sur zimb.app également et qui présentera le service, et permettra de récruter des devs senior. 

On utilisera stripe connect pour garantir que les fonds sont disponibles chez celui qui crée le ticket, et il faudra également une garantie que le ticket est résolue correctement. Gestion des litiges via d'autre tuteur. On prend 20% de commission. Si litige, il y a, alors le reviewer prend la commission. Le demandeur peut cliquer sur Quick Win ! Ce qui validera le paiement, soit un auto close après 24h. 

un orchestrateur fait le pont entre l'extension, l'api airtable les webhooks github et stripe connect

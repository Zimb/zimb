---
name: flutter-web-zimb
description: Use when building the Flutter Web senior-facing Kanban at app.zimb.app. Covers Material 3 web patterns, the Cloudflare Pages build target, Inter + JetBrains Mono typography, WebSocket subscription, urgency color tokens, and post-it ticket cards. Last updated 2026-09.
---

# Flutter Web — Zimb Senior Kanban

## Stack cible

| Item | Version | Notes |
|---|---|---|
| Flutter | 3.24+ (stable) | Web only target |
| Dart | 3.5+ | Strict mode |
| State | Riverpod 2.x | `Notifier` (pas `StateNotifier`) |
| Router | go_router 14+ | Web URL-based |
| Material | Material 3 | Web (pas mobile) |
| Typography | Inter + JetBrains Mono | Chargées en local ET via Google Fonts CDN en fallback |

## Doc officielle

- Flutter Web : <https://docs.flutter.dev/platform-integration/web>
- Material 3 : <https://m3.material.io/develop/web>
- Riverpod 2.x Notifier : <https://riverpod.dev/docs/concepts/about_code_generation>
- go_router : <https://pub.dev/packages/go_router>
- Deploy Flutter Web to Cloudflare Pages : <https://developers.cloudflare.com/pages/framework-guides/deploy-a-flutter-web-app/>

## Patterns Zimb

### Couleurs urgence (déjà dans `packages/app-web/lib/theme/colors.dart`)

```dart
ZimbColors.forUrgency('critical') // → Color(0xFF8B5CF6) violet
ZimbColors.forUrgency('high')     // → Color(0xFFEF4444) red
ZimbColors.forUrgency('medium')   // → Color(0xFFF59E0B) amber
ZimbColors.forUrgency('low')      // → Color(0xFF10B981) green
```

### Post-it card (pattern de base)

```dart
class TicketPostIt extends StatelessWidget {
  const TicketPostIt({super.key, required this.ticket});
  final Ticket ticket;

  @override
  Widget build(BuildContext context) {
    final color = ZimbColors.forUrgency(ticket.urgency);
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ticket.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                UrgencyBadge(urgency: ticket.urgency),
                const Spacer(),
                Text('${ticket.bounty} €', style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

### WebSocket Kanban client

```dart
import 'package:web_socket_channel/web_socket_channel.dart';

class KanbanSocket {
  KanbanSocket(String url) : _channel = WebSocketChannel.connect(Uri.parse(url));
  final WebSocketChannel _channel;

  Stream<Map<String, dynamic>> get events =>
      _channel.stream.map((raw) => jsonDecode(raw as String) as Map<String, dynamic>);

  void close() => _channel.sink.close();
}

// Events to handle (see recettes/06-notifications-realtime.md):
// { type: 'TICKET_GONE', ticketId, claimedBy, bounty, languages, urgency }
// { type: 'CLAIMED_BY_ME', ticketId }
// { type: 'TICKET_CREATED', ticket }
```

## Pièges connus

| Piège | Solution |
|---|---|
| `flutter build web` produit un dossier `build/web/` mais pas un SPA routable | Utiliser `--web-renderer html` pour SPA classique, ou `canvaskit` pour plus de fidélité visuelle |
| Les polices Google Fonts CDN ne se chargent pas hors-ligne | Déclarer les `.ttf` en assets locaux dans `pubspec.yaml` (voir `assets/fonts/.gitkeep`) |
| `WebSocketChannel` ne reconnecte pas auto | Wrapper dans un `Stream` qui retry avec backoff exponentiel |
| Le hot-reload de Flutter Web perd la session OAuth | Stocker le JWT en `SharedPreferences` ou `window.localStorage` |
| `useMaterial3: true` + thème custom → couleurs incohérentes | Utiliser `ColorScheme.fromSeed(seedColor: ZimbColors.primary)` (déjà dans `theme.dart`) |
| CanvasKit ajoute ~1.5 Mo au bundle | Si SEO/perf critiques, basculer en `--web-renderer html` (perte de certaines animations Material 3) |

## Checklist pré-codage

- [ ] Le widget respecte-t-il le breakpoint desktop-first (≥ 1280×800) ?
- [ ] Les couleurs viennent-elles de `ZimbColors.forUrgency()` (jamais de hex en dur) ?
- [ ] Le state est-il dans un `Notifier` Riverpod (pas `setState`) ?
- [ ] La reconnexion WebSocket gère-t-elle le cas 30-min offline (CT-NOT-04) ?
- [ ] Les fonts sont-elles en assets locaux (pas seulement CDN) ?
- [ ] Le contraste texte/fond respecte-t-il WCAG AA (4.5:1 minimum) ?

## Build & deploy

```bash
# Local dev
flutter run -d chrome --web-port 8080

# Build pour Cloudflare Pages
flutter build web --release --web-renderer canvaskit
# → sortiedans build/web/
# → Cloudflare Pages: wrangler pages deploy build/web --project-name zimb-app-web
```

CI : voir `.github/workflows/ci.yml` — le job `quality` inclut `app-web` avec `flutter analyze` + `flutter test`.

## Liens internes

- Spec UI/UX : [../../../SPECIFICATIONS.md](../../../SPECIFICATIONS.md#32-application-flutter-web-appzimbapp)
- Tests E2E : [../../../recettes/02-kanban-lock-timer.md](../../../recettes/02-kanban-lock-timer.md), [../../../recettes/06-notifications-realtime.md](../../../recettes/06-notifications-realtime.md)
- Agent dédié : `Flutter Web Kanban` (voir `.github/agents/`)

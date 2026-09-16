# `@zimb/app-web` — Flutter Web Kanban (app.zimb.app)

> Senior-facing application: Kanban of open tickets, Lock & Timer 45 min, Match ! notifications.

## Stack

- **Framework**: Flutter 3.24+ (stable channel)
- **Target**: Web only (Chrome, Firefox, Safari)
- **State**: Riverpod
- **Routing**: go_router
- **Material**: Material 3
- **Typography**: Inter (sans-serif) + JetBrains Mono (code)

## Local development

```bash
# 1. Install Flutter (https://flutter.dev/docs/get-started/install)
# 2. Verify setup
flutter doctor

# 3. Install dependencies
flutter pub get

# 4. Run dev server (auto-binds to http://localhost:8080)
flutter run -d chrome

# 5. Build for production (output in build/web/)
flutter build web --release
```

## Project structure

```
lib/
├── main.dart                  # Entry point + router
├── app.dart                   # MaterialApp + theme
├── screens/
│   ├── kanban_screen.dart     # Main ticket grid
│   ├── my_tickets_screen.dart # "Mes tickets" view
│   └── ticket_detail_screen.dart # Modal/route for detail
├── widgets/
│   ├── ticket_post_it.dart    # Color-coded post-it
│   ├── urgency_badge.dart     # Color pill (low/med/high/critical)
│   ├── lock_timer.dart        # 45min countdown with pulse
│   ├── match_toast.dart       # "🎯 @user has claimed" toast
│   └── filter_panel.dart      # Swipeable filter UI
├── services/
│   ├── api_client.dart        # REST wrapper around api.zimb.app
│   ├── ws_client.dart         # WebSocket client for kanban events
│   ├── auth_service.dart      # JWT management
│   └── preferences_service.dart # Filter prefs (bounty min, urgency)
├── models/
│   ├── ticket.dart
│   ├── claim.dart
│   └── user.dart
└── theme/
    ├── colors.dart            # Urgency palette tokens
    ├── typography.dart        # Inter + JetBrains Mono
    └── theme.dart             # Material 3 ThemeData
```

## Visual tokens

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#4F46E5` (Indigo) | CTAs |
| `--color-urgent-low` | `#10B981` (Vert) | low priority |
| `--color-urgent-medium` | `#F59E0B` (Jaune) | medium |
| `--color-urgent-high` | `#EF4444` (Rouge) | high |
| `--color-urgent-critical` | `#8B5CF6` (Violet) | critical |
| `--font-primary` | Inter | All UI |
| `--font-code` | JetBrains Mono | Code blocks |

## Testing

```bash
# Unit tests
flutter test

# Integration tests (E2E in headless Chrome)
flutter test integration_test -d chrome
```

## Deploy

The build output (`build/web/`) is deployed to Cloudflare Pages:

- Production: https://app.zimb.app
- Staging: https://app-staging.zimb.app

See `cloudflare-pages.config.json` for routing rules.

/**
 * Zimb Flutter Web — entry point
 *
 * Hosts the Kanban UI at app.zimb.app.
 * Talks to api.zimb.app for REST + WebSocket.
 *
 * See SPECIFICATIONS.md §3.2 for the full UX specification.
 */
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app.dart';
import 'screens/kanban_screen.dart';
import 'screens/my_tickets_screen.dart';
import 'theme/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: ZimbApp()));
}

/// Router config — used for navigation between screens.
final goRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/kanban',
    routes: [
      GoRoute(
        path: '/kanban',
        builder: (_, __) => const KanbanScreen(),
      ),
      GoRoute(
        path: '/my-tickets',
        builder: (_, __) => const MyTicketsScreen(),
      ),
    ],
  );
});

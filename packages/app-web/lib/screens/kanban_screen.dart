import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Main Kanban screen — shows open tickets as post-it cards.
///
/// This is a skeleton. Real implementation per SPECIFICATIONS.md §3.2:
/// - Color by urgency (green/amber/red/purple)
/// - Swipe/scroll gestures
/// - Tap → modal detail
/// - WebSocket subscription for Match ! events (CT-NOT-01)
/// - Filters: urgency min, bounty min, languages
class KanbanScreen extends ConsumerWidget {
  const KanbanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zimb — Open Tickets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              // TODO: open FilterPanel
            },
          ),
          IconButton(
            icon: const Icon(Icons.assignment),
            tooltip: 'My tickets',
            onPressed: () {
              // TODO: navigate to MyTicketsScreen
            },
          ),
        ],
      ),
      body: const Center(
        child: Text(
          '🌱 Kanban scaffold ready.\n'
          'Connect to api.zimb.app to fetch tickets.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

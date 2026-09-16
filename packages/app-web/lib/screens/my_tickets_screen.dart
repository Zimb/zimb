import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// "My tickets" view — tickets claimed by the current senior.
///
/// Real implementation per SPECIFICATIONS.md §3.2 + CT-KAN-04:
/// - List of tickets with status (in_progress / delivered / validated / disputed)
/// - Lock timer for active ones (45min countdown)
/// - "Mark as delivered" button
class MyTicketsScreen extends ConsumerWidget {
  const MyTicketsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My tickets'),
      ),
      body: const Center(
        child: Text('🌱 My-tickets scaffold ready.'),
      ),
    );
  }
}

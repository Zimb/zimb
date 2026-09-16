import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'main.dart';
import 'theme/theme.dart';

class ZimbApp extends ConsumerWidget {
  const ZimbApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'Zimb — Senior Kanban',
      debugShowCheckedModeBanner: false,
      theme: ZimbTheme.light(),
      darkTheme: ZimbTheme.dark(),
      routerConfig: router,
    );
  }
}

import 'package:flutter/material.dart';

/// Zimb color palette — see SPECIFICATIONS.md §3.4
abstract final class ZimbColors {
  // ── Primary ─────────────────────────────────────────────────
  static const Color primary = Color(0xFF4F46E5); // Indigo
  static const Color primaryDark = Color(0xFF3730A3);

  // ── Urgency palette ────────────────────────────────────────
  static const Color urgentLow = Color(0xFF10B981); // green
  static const Color urgentMedium = Color(0xFFF59E0B); // amber
  static const Color urgentHigh = Color(0xFFEF4444); // red
  static const Color urgentCritical = Color(0xFF8B5CF6); // purple

  // ── Neutrals (Slate) ───────────────────────────────────────
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate900 = Color(0xFF0F172A);

  /// Returns the urgency color for a given level.
  static Color forUrgency(String urgency) {
    switch (urgency) {
      case 'low':
        return urgentLow;
      case 'medium':
        return urgentMedium;
      case 'high':
        return urgentHigh;
      case 'critical':
        return urgentCritical;
      default:
        return urgentMedium;
    }
  }
}

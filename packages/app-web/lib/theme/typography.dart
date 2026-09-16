import 'package:flutter/material.dart';

/// Typography — Inter for UI, JetBrains Mono for code blocks.
abstract final class ZimbTypography {
  static const String fontFamilyPrimary = 'Inter';
  static const String fontFamilyCode = 'JetBrainsMono';

  static TextTheme textTheme(ColorScheme scheme) => TextTheme(
        displayLarge: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 57,
          fontWeight: FontWeight.w700,
          color: scheme.onSurface,
          height: 1.12,
        ),
        headlineLarge: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 32,
          fontWeight: FontWeight.w700,
          color: scheme.onSurface,
          height: 1.25,
        ),
        headlineMedium: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 28,
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
          height: 1.29,
        ),
        titleLarge: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 22,
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
        ),
        titleMedium: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
        ),
        bodyLarge: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 16,
          fontWeight: FontWeight.w400,
          color: scheme.onSurface,
          height: 1.5,
        ),
        bodyMedium: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: scheme.onSurface,
          height: 1.43,
        ),
        labelLarge: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: scheme.onSurface,
        ),
        labelMedium: TextStyle(
          fontFamily: fontFamilyPrimary,
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: scheme.onSurfaceVariant,
        ),
      );
}

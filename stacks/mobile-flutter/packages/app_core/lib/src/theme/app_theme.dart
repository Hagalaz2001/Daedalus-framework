import 'package:flutter/material.dart';

import 'tokens.g.dart';

/// Material 3 theme built from design/tokens.json, so Flutter matches the web app's Tailwind theme.
ThemeData appTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    onPrimary: AppColors.onPrimary,
    surface: AppColors.surface,
    onSurface: AppColors.text,
    error: AppColors.danger,
    outline: AppColors.border,
  );
  final rounded = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.surface,
    fontFamily: AppFonts.sans,
    filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(shape: rounded)),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.md),
        borderSide: const BorderSide(color: AppColors.border),
      ),
    ),
    cardTheme: CardThemeData(
      shape: rounded.copyWith(side: const BorderSide(color: AppColors.border)),
      elevation: 0,
    ),
  );
}

import 'package:app_core/app_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:forui/forui.dart';

/// Forui theme built from design/tokens.json (through app_core's AppColors), light and dark.
///
/// The dark palette is derived from the light one: the ink colour becomes the canvas, paper becomes the text and
/// accents are lifted for contrast. design/tokens.json cannot override it on the Flutter side yet.
FThemeData appFTheme(Brightness brightness) => FThemeData(
      colors: _colors(brightness),
      touch: true,
      debugLabel: 'App ${brightness.name}',
    );

FColors _colors(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final p = dark ? _Palette.dark() : _Palette.light();
  return FColors(
    brightness: brightness,
    systemOverlayStyle: dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
    barrier: const Color(0x7A000000),
    background: p.surface,
    foreground: p.text,
    primary: p.primary,
    primaryForeground: p.onPrimary,
    secondary: p.surfaceMuted,
    secondaryForeground: p.text,
    muted: p.surfaceMuted,
    mutedForeground: p.textMuted,
    destructive: p.danger,
    destructiveForeground: _on(p.danger),
    error: p.danger,
    errorForeground: _on(p.danger),
    card: p.surface,
    border: p.border,
  );
}

/// Extra colours the Forui palette has no slot for.
extension AppStatusColors on BuildContext {
  Color get success => Theme.of(this).brightness == Brightness.dark ? _Palette.dark().success : _Palette.light().success;
  Color get warning => Theme.of(this).brightness == Brightness.dark ? _Palette.dark().warning : _Palette.light().warning;
}

Color _on(Color bg) => bg.computeLuminance() > 0.18 ? const Color(0xFF0B0F19) : const Color(0xFFFFFFFF);

class _Palette {
  const _Palette({
    required this.primary,
    required this.onPrimary,
    required this.surface,
    required this.surfaceMuted,
    required this.text,
    required this.textMuted,
    required this.border,
    required this.success,
    required this.warning,
    required this.danger,
  });

  factory _Palette.light() => const _Palette(
        primary: AppColors.primary,
        onPrimary: AppColors.onPrimary,
        surface: AppColors.surface,
        surfaceMuted: AppColors.surfaceMuted,
        text: AppColors.text,
        textMuted: AppColors.textMuted,
        border: AppColors.border,
        success: AppColors.success,
        warning: AppColors.warning,
        danger: AppColors.danger,
      );

  factory _Palette.dark() {
    Color lift(Color c) => Color.lerp(c, Colors.white, 0.3)!;
    final surface = Color.lerp(AppColors.text, Colors.black, 0.35)!;
    final primary = lift(AppColors.primary);
    return _Palette(
      primary: primary,
      onPrimary: _on(primary),
      surface: surface,
      surfaceMuted: Color.lerp(surface, Colors.white, 0.07)!,
      text: Color.lerp(AppColors.surface, surface, 0.04)!,
      textMuted: Color.lerp(AppColors.surface, surface, 0.35)!,
      border: Color.lerp(surface, Colors.white, 0.16)!,
      success: lift(AppColors.success),
      warning: lift(AppColors.warning),
      danger: lift(AppColors.danger),
    );
  }

  final Color primary, onPrimary, surface, surfaceMuted, text, textMuted, border, success, warning, danger;
}

/// Material theme for the few Material widgets in use (page transitions, pull to refresh, text selection).
ThemeData appMaterialTheme(Brightness brightness) {
  final c = _colors(brightness);
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    scaffoldBackgroundColor: c.background,
    colorScheme: ColorScheme.fromSeed(seedColor: c.primary, brightness: brightness).copyWith(
      primary: c.primary,
      onPrimary: c.primaryForeground,
      surface: c.background,
      onSurface: c.foreground,
      error: c.error,
    ),
  );
}

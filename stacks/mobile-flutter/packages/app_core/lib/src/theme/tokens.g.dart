// Generated from design/tokens.json by scripts/tokens/mobile-flutter.ts. Do not edit; run `deno task sync`.
// ignore_for_file: constant_identifier_names
import 'package:flutter/painting.dart';

/// Light palette.
abstract final class AppColors {
  static const primary = Color(0xFF2A4BD7);
  static const onPrimary = Color(0xFFFFFFFF);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFF5F6F8);
  static const text = Color(0xFF0E1116);
  static const textMuted = Color(0xFF525A66);
  static const border = Color(0xFFE1E4EA);
  static const success = Color(0xFF17743D);
  static const warning = Color(0xFFA15C07);
  static const danger = Color(0xFFB42318);
}

/// Dark palette: `colorDark` from the tokens file, with missing roles derived from the light colours.
abstract final class AppColorsDark {
  static const primary = Color(0xFF8DA2FF);
  static const onPrimary = Color(0xFF0B1030);
  static const surface = Color(0xFF0E1116);
  static const surfaceMuted = Color(0xFF161A21);
  static const text = Color(0xFFEEF0F4);
  static const textMuted = Color(0xFFA3ABB8);
  static const border = Color(0xFF262B34);
  static const success = Color(0xFF4CCB85);
  static const warning = Color(0xFFF0B45A);
  static const danger = Color(0xFFFF8A7D);
}

abstract final class AppRadius {
  static const double sm = 6;
  static const double md = 10;
  static const double lg = 14;
}

abstract final class AppSpace {
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s6 = 24;
  static const double s8 = 32;
}

abstract final class AppFonts {
  static const sans = 'Geist';
  static const mono = 'Geist Mono';
}

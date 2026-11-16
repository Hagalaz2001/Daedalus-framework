import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Device-local preferences: the chosen theme and whether the first-run introduction was seen.
class ThemeModeController extends Notifier<ThemeMode> {
  static const _key = 'theme_mode';

  @override
  ThemeMode build() {
    SharedPreferences.getInstance().then((p) {
      final saved = ThemeMode.values.where((m) => m.name == p.getString(_key));
      if (saved.isNotEmpty) state = saved.first;
    }).catchError((_) {});
    return ThemeMode.system;
  }

  Future<void> set(ThemeMode mode) async {
    state = mode;
    try {
      await (await SharedPreferences.getInstance()).setString(_key, mode.name);
    } catch (_) {
      // Storage can be unavailable; the choice still applies for this session.
    }
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(ThemeModeController.new);

class OnboardedController extends AsyncNotifier<bool> {
  static const _key = 'onboarded';

  @override
  Future<bool> build() async {
    try {
      return (await SharedPreferences.getInstance()).getBool(_key) ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> complete() async {
    state = const AsyncData(true);
    try {
      await (await SharedPreferences.getInstance()).setBool(_key, true);
    } catch (_) {
      // Storage can be unavailable; onboarding is simply shown again next launch.
    }
  }
}

final onboardedProvider = AsyncNotifierProvider<OnboardedController, bool>(OnboardedController.new);

// Golden screenshots of the main screens at phone size (390 x 844 dp), light and dark.
// Regenerate after a deliberate UI change: flutter test --update-goldens test/goldens_test.dart
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support.dart';

/// Screenshots depend on the platform text renderer, so they are compared only on request:
///   GOLDENS=1 flutter test test/goldens_test.dart      (compare)
///   flutter test --update-goldens test/goldens_test.dart  (rewrite)
final _skip = !(autoUpdateGoldenFiles || Platform.environment['GOLDENS'] == '1');

void main() {
  for (final mode in [ThemeMode.light, ThemeMode.dark]) {
    final suffix = mode.name;

    testWidgets('onboarding $suffix', (tester) async {
      await pumpApp(tester, signedIn: false, onboarded: false, mode: mode);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/onboarding_$suffix.png'));
    }, skip: _skip);

    testWidgets('sign in $suffix', (tester) async {
      await pumpApp(tester, signedIn: false, mode: mode);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/sign_in_$suffix.png'));
    }, skip: _skip);

    testWidgets('home $suffix', (tester) async {
      await pumpApp(tester, mode: mode);
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/home_$suffix.png'));
    }, skip: _skip);

    testWidgets('notes $suffix', (tester) async {
      await pumpApp(tester, mode: mode);
      await tester.tap(find.text('Notes').last);
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/notes_$suffix.png'));
    }, skip: _skip);

    testWidgets('settings $suffix', (tester) async {
      await pumpApp(tester, mode: mode);
      await tester.tap(find.text('Settings').last);
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/settings_$suffix.png'));
    }, skip: _skip);

    testWidgets('profile $suffix', (tester) async {
      await pumpApp(tester, mode: mode);
      await tester.tap(find.text('Settings').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ana Rivera'));
      await tester.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/profile_$suffix.png'));
    }, skip: _skip);
  }
}

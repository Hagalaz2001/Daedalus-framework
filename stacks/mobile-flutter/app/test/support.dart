import 'dart:convert';
import 'dart:io';

import 'package:app_core/app_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/account_api.dart';
import 'package:mobile/core/auth_provider.dart';
import 'package:mobile/features/notes/data/notes_repository.dart';
import 'package:mobile/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// In-memory notes, so screens run without a backend.
class FakeNotes implements NotesRepository {
  FakeNotes([Iterable<Note> seed = const []]) : items = [...seed];
  final List<Note> items;
  Object? failWith;

  @override
  Future<List<Note>> list() async {
    if (failWith != null) throw failWith!;
    return List.of(items);
  }

  @override
  Future<Note> create(String text) async {
    final note = Note(id: 'n${items.length + 1}', text: text, createdAt: DateTime.now());
    items.insert(0, note);
    return note;
  }

  @override
  Future<void> delete(String id) async => items.removeWhere((n) => n.id == id);
}

class MemoryTokenStore implements TokenStore {
  String? token;
  @override
  Future<String?> read() async => token;
  @override
  Future<void> write(String t) async => token = t;
  @override
  Future<void> clear() async => token = null;
}

class SignedIn extends AuthController {
  @override
  Future<AuthSession?> build() async =>
      const AuthSession(token: 't', user: AuthUser(id: 'u1', name: 'Ana Rivera', email: 'ana@example.com'));
}

class SignedOut extends AuthController {
  @override
  Future<AuthSession?> build() async => null;
}

class FakeAccount implements AccountApi {
  int resets = 0;
  int deletes = 0;
  @override
  Future<void> requestPasswordReset(String email) async => resets++;
  @override
  Future<void> deleteAccount() async => deletes++;
}

final sampleNotes = [
  Note(id: '1', text: 'Draft the quarterly report outline', createdAt: DateTime.now().subtract(const Duration(minutes: 20))),
  Note(id: '2', text: 'Call the venue about Thursday setup', createdAt: DateTime.now().subtract(const Duration(days: 2))),
  Note(id: '3', text: 'Review the new onboarding copy with the team', createdAt: DateTime.now().subtract(const Duration(days: 12))),
];

bool _fontsLoaded = false;

/// Tests draw text with a block placeholder font unless a real one is loaded: use Roboto from the Flutter SDK,
/// under the names the app and Forui ask for, so layout and screenshots look like the device.
Future<void> _loadFonts() async {
  if (_fontsLoaded) return;
  _fontsLoaded = true;
  await _loadLucide();
  final root = Platform.environment['FLUTTER_ROOT'] ?? File(Platform.resolvedExecutable).parent.parent.parent.parent.parent.parent.path;
  final dir = Directory('$root/bin/cache/artifacts/material_fonts');
  if (!dir.existsSync()) return;
  final wanted = RegExp(r'roboto-(regular|medium|bold)\.ttf$');
  final files = dir.listSync().whereType<File>().where((f) => wanted.hasMatch(f.path.toLowerCase())).toList();
  for (final family in ['Roboto', 'packages/forui/Inter']) {
    final loader = FontLoader(family);
    for (final f in files) {
      loader.addFont(Future.value(ByteData.sublistView(f.readAsBytesSync())));
    }
    await loader.load();
  }
}

/// Icon fonts of packages are not loaded by flutter test; Forui's Lucide icons would draw as empty boxes.
Future<void> _loadLucide() async {
  final config = File('.dart_tool/package_config.json');
  if (!config.existsSync()) return;
  final packages = (jsonDecode(config.readAsStringSync()) as Map)['packages'] as List;
  final lucide = packages.cast<Map>().where((p) => p['name'] == 'forui_lucide').firstOrNull;
  if (lucide == null) return;
  final ttf = File.fromUri(Uri.parse('${lucide['rootUri']}/assets/lucide.ttf'));
  if (!ttf.existsSync()) return;
  final loader = FontLoader('packages/forui_lucide/ForuiLucideIcons')
    ..addFont(Future.value(ByteData.sublistView(ttf.readAsBytesSync())));
  await loader.load();
}

/// Pumps the whole app at phone size with fakes. [onboarded] false shows the introduction first.
Future<void> pumpApp(
  WidgetTester tester, {
  bool signedIn = true,
  bool onboarded = true,
  FakeNotes? notes,
  FakeAccount? account,
  ThemeMode mode = ThemeMode.light,
}) async {
  await _loadFonts();
  SharedPreferences.setMockInitialValues({'onboarded': onboarded, 'theme_mode': mode.name});
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(ProviderScope(
    overrides: [
      authProvider.overrideWith(signedIn ? SignedIn.new : SignedOut.new),
      tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
      notesRepositoryProvider.overrideWithValue(notes ?? FakeNotes(sampleNotes)),
      accountApiProvider.overrideWithValue(account ?? FakeAccount()),
    ],
    child: const App(),
  ));
  await tester.pumpAndSettle();
}

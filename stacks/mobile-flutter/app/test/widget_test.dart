import 'package:app_core/app_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/auth_provider.dart';
import 'package:mobile/features/notes/data/notes_repository.dart';
import 'package:mobile/main.dart';

class FakeNotes implements NotesRepository {
  final items = <Note>[];
  @override
  Future<List<Note>> list() async => List.of(items);
  @override
  Future<Note> create(String text) async {
    final note = Note(id: '${items.length}', text: text, createdAt: DateTime(2026));
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
      const AuthSession(token: 't', user: AuthUser(id: 'u1', name: 'Ana', email: 'ana@example.com'));
}

void main() {
  testWidgets('signed out: shows the sign-in screen', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [tokenStoreProvider.overrideWithValue(MemoryTokenStore())],
      child: const App(),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('New here? Create an account'), findsOneWidget);
  });

  testWidgets('signed in: adds a note and shows it', (tester) async {
    await tester.pumpWidget(ProviderScope(
      overrides: [
        authProvider.overrideWith(SignedIn.new),
        notesRepositoryProvider.overrideWithValue(FakeNotes()),
      ],
      child: const App(),
    ));
    await tester.pumpAndSettle();
    expect(find.text('No notes yet. Write the first one above.'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'hello');
    await tester.tap(find.text('Add'));
    await tester.pumpAndSettle();
    expect(find.text('hello'), findsOneWidget);
  });
}

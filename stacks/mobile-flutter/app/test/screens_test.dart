import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:forui/forui.dart';
import 'package:mobile/features/notes/data/note_filter.dart';

import 'support.dart';

void main() {
  group('first run and signed out', () {
    testWidgets('shows the introduction, then sign in', (tester) async {
      await pumpApp(tester, signedIn: false, onboarded: false);
      expect(find.text('Capture in seconds'), findsOneWidget);
      await tester.tap(find.text('Next'));
      await tester.pumpAndSettle();
      expect(find.text('Find it again'), findsOneWidget);
      await tester.tap(find.text('Skip'));
      await tester.pumpAndSettle();
      expect(find.text('Welcome back'), findsOneWidget);
    });

    testWidgets('sign in validates before calling the server', (tester) async {
      await pumpApp(tester, signedIn: false);
      await tester.tap(find.widgetWithText(FButton, 'Sign in'));
      await tester.pumpAndSettle();
      expect(find.text('Enter a valid email address.'), findsOneWidget);
      expect(find.text('Enter your password.'), findsOneWidget);
    });

    testWidgets('forgot password confirms once the link was requested', (tester) async {
      final account = FakeAccount();
      await pumpApp(tester, signedIn: false, account: account);
      await tester.tap(find.text('Forgot password?'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(EditableText), 'me@example.com');
      await tester.tap(find.widgetWithText(FButton, 'Send reset link'));
      await tester.pumpAndSettle();
      expect(find.text('Check your inbox'), findsOneWidget);
      expect(account.resets, 1);
    });

    testWidgets('sign up asks for a name, an email and an 8 character password', (tester) async {
      await pumpApp(tester, signedIn: false);
      await tester.tap(find.text('New here? Create an account'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FButton, 'Create account'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your name.'), findsOneWidget);
      expect(find.text('Use at least 8 characters.'), findsOneWidget);
    });
  });

  group('signed in', () {
    testWidgets('home shows the numbers and the latest notes', (tester) async {
      await pumpApp(tester);
      expect(find.text('Ana Rivera'), findsOneWidget);
      expect(find.text('Total notes'), findsOneWidget);
      expect(find.text('Draft the quarterly report outline'), findsOneWidget);
    });

    testWidgets('empty list offers a way to create', (tester) async {
      await pumpApp(tester, notes: FakeNotes());
      await tester.tap(find.text('Notes').last);
      await tester.pumpAndSettle();
      expect(find.text('No notes yet'), findsOneWidget);
    });

    testWidgets('failed load shows the error state and retries', (tester) async {
      final notes = FakeNotes(sampleNotes)..failWith = Exception('boom');
      await pumpApp(tester, notes: notes);
      await tester.tap(find.text('Notes').last);
      await tester.pumpAndSettle();
      expect(find.text('Something went wrong'), findsWidgets);
      notes.failWith = null;
      await tester.tap(find.text('Try again').first);
      await tester.pumpAndSettle();
      expect(find.text('Draft the quarterly report outline'), findsOneWidget);
    });

    testWidgets('search filters the list and reports no matches', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('Notes').last);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(EditableText).first, 'venue');
      await tester.pumpAndSettle();
      expect(find.text('Call the venue about Thursday setup'), findsOneWidget);
      expect(find.text('Draft the quarterly report outline'), findsNothing);
      await tester.enterText(find.byType(EditableText).first, 'zzz');
      await tester.pumpAndSettle();
      expect(find.text('No matching notes'), findsOneWidget);
    });

    testWidgets('creating a note adds it', (tester) async {
      final notes = FakeNotes();
      await pumpApp(tester, notes: notes);
      await tester.tap(find.text('Notes').last);
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('New note').first);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(EditableText), 'Buy milk');
      await tester.tap(find.widgetWithText(FButton, 'Save note'));
      await tester.pumpAndSettle(const Duration(seconds: 1));
      expect(notes.items.single.text, 'Buy milk');
    });

    testWidgets('deleting a note asks first', (tester) async {
      final notes = FakeNotes(sampleNotes);
      await pumpApp(tester, notes: notes);
      await tester.tap(find.text('Draft the quarterly report outline'));
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Delete note'));
      await tester.pumpAndSettle();
      expect(find.text('Delete this note?'), findsOneWidget);
      await tester.tap(find.widgetWithText(FButton, 'Delete'));
      await tester.pumpAndSettle(const Duration(seconds: 1));
      expect(notes.items.length, 2);
    });

    testWidgets('profile can delete the account after confirming', (tester) async {
      final account = FakeAccount();
      await pumpApp(tester, account: account);
      await tester.tap(find.text('Settings').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Ana Rivera'));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Delete my account'), 100, scrollable: find.byType(Scrollable).first);
      await tester.tap(find.widgetWithText(FButton, 'Delete my account'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FButton, 'Delete forever'));
      await tester.pumpAndSettle(const Duration(seconds: 1));
      expect(account.deletes, 1);
    });

    testWidgets('settings switches to dark theme', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('Settings').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Light'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Dark').last);
      await tester.pumpAndSettle();
      expect(Theme.of(tester.element(find.byType(FScaffold).first)).brightness, Brightness.dark);
    });
  });

  test('filterNotes searches, limits by range and sorts', () {
    final now = DateTime(2026, 3, 10, 12);
    final notes = sampleNotes
        .map((n) => n)
        .toList();
    expect(filterNotes(notes, 'venue', NoteRange.all, NoteSort.newest).length, 1);
    expect(filterNotes(notes, '', NoteRange.today, NoteSort.newest, now: DateTime.now()).length, 1);
    expect(filterNotes(notes, '', NoteRange.all, NoteSort.oldest).first.id, '3');
    expect(formatNoteDate(DateTime(2026, 1, 2), now: now), 'Jan 2');
  });
}

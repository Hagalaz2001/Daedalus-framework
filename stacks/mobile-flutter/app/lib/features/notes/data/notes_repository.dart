import 'package:app_core/app_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api_provider.dart';

abstract class NotesRepository {
  Future<List<Note>> list();
  Future<Note> create(String text);
  Future<void> delete(String id);
}

class ApiNotesRepository implements NotesRepository {
  ApiNotesRepository(this._api);
  final ApiClient _api;

  @override
  Future<List<Note>> list() => _api.notes.listNotes();

  @override
  Future<Note> create(String text) => _api.notes.createNote(body: NewNote(text: text));

  @override
  Future<void> delete(String id) => _api.notes.deleteNote(id: id);
}

final notesRepositoryProvider = Provider<NotesRepository>(
  (ref) => ApiNotesRepository(ref.watch(apiClientProvider)),
);

final notesProvider = FutureProvider<List<Note>>(
  (ref) => ref.watch(notesRepositoryProvider).list(),
);

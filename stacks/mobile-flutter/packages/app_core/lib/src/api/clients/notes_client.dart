// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, unused_import, invalid_annotation_target, unnecessary_import

import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../models/new_note.dart';
import '../models/note.dart';

part 'notes_client.g.dart';

@RestApi()
abstract class NotesClient {
  factory NotesClient(Dio dio, {String? baseUrl}) = _NotesClient;

  @GET('/notes')
  Future<List<Note>> listNotes();

  @POST('/notes')
  Future<Note> createNote({
    @Body() required NewNote body,
  });

  @DELETE('/notes/{id}')
  Future<void> deleteNote({
    @Path('id') required String id,
  });
}

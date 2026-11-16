// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, unused_import, invalid_annotation_target, unnecessary_import

import 'package:json_annotation/json_annotation.dart';

part 'note.g.dart';

@JsonSerializable()
class Note {
  const Note({
    required this.id,
    required this.text,
    required this.createdAt,
  });
  
  factory Note.fromJson(Map<String, Object?> json) => _$NoteFromJson(json);
  
  final String id;
  final String text;
  final DateTime createdAt;

  Map<String, Object?> toJson() => _$NoteToJson(this);
}

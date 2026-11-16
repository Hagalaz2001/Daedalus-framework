// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, unused_import, invalid_annotation_target, unnecessary_import

import 'package:json_annotation/json_annotation.dart';

part 'new_note.g.dart';

@JsonSerializable()
class NewNote {
  const NewNote({
    required this.text,
  });
  
  factory NewNote.fromJson(Map<String, Object?> json) => _$NewNoteFromJson(json);
  
  final String text;

  Map<String, Object?> toJson() => _$NewNoteToJson(this);
}

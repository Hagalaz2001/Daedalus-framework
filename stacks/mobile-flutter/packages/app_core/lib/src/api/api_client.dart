// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, unused_import, invalid_annotation_target, unnecessary_import

import 'package:dio/dio.dart';

import 'clients/system_client.dart';
import 'clients/notes_client.dart';

/// App API `v0.1.0`.
///
/// Single source of truth for backend, web and mobile. Change this file first, then run `deno task sync` to regenerate the TypeScript and Dart clients. Sign-up, sign-in and sign-out are Better Auth's endpoints under /api/auth/* (not listed here): POST /api/auth/sign-up/email, POST /api/auth/sign-in/email, POST /api/auth/sign-out, GET /api/auth/get-session. Web apps use the session cookie; mobile apps send the token from the sign-in response header `set-auth-token` as `Authorization: Bearer <token>`.
///
class ApiClient {
  ApiClient(
    Dio dio, {
    String? baseUrl,
  })  : _dio = dio,
        _baseUrl = baseUrl;

  final Dio _dio;
  final String? _baseUrl;

  static String get version => '0.1.0';

  SystemClient? _system;
  NotesClient? _notes;

  SystemClient get system => _system ??= SystemClient(_dio, baseUrl: _baseUrl);

  NotesClient get notes => _notes ??= NotesClient(_dio, baseUrl: _baseUrl);
}

import 'package:app_core/app_core.dart';
import 'package:dio/dio.dart';

/// A message fit to show a person, for any error a screen can catch.
String friendlyError(Object error) {
  if (error is AuthException) return error.message;
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map && data['message'] is String) return data['message'] as String;
    if (error.response == null) return "Can't reach the server. Check your connection and try again.";
  }
  return 'Something went wrong. Try again.';
}

final _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

String? validateEmail(String v) => _email.hasMatch(v.trim()) ? null : 'Enter a valid email address.';
String? validatePassword(String v) => v.length >= 8 ? null : 'Use at least 8 characters.';
String? validateName(String v) => v.trim().isEmpty ? 'Enter your name.' : null;

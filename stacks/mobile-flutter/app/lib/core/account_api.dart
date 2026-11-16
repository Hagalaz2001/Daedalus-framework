import 'package:app_core/app_core.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_provider.dart';
import 'auth_provider.dart';

/// Account actions that live in Better Auth (/api/auth/*) rather than in the OpenAPI contract:
/// password reset and account deletion.
///
/// The backend must enable them: a `sendResetPassword` handler for [requestPasswordReset] and
/// `user.deleteUser.enabled` for [deleteAccount]. Until then both report a plain error message.
class AccountApi {
  AccountApi(this._token)
      : _dio = Dio(
          BaseOptions(
            baseUrl: apiBaseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            validateStatus: (_) => true,
          ),
        );

  final String? _token;
  final Dio _dio;

  Future<void> requestPasswordReset(String email) => _post('/api/auth/request-password-reset', {'email': email});

  Future<void> deleteAccount() => _post('/api/auth/delete-user', <String, Object?>{});

  Future<void> _post(String path, Map<String, Object?> body) async {
    final Response<Object?> res;
    try {
      res = await _dio.post<Object?>(
        path,
        data: body,
        options: Options(headers: {if (_token != null) 'Authorization': 'Bearer $_token'}),
      );
    } on DioException {
      throw AuthException("Can't reach the server. Check your connection and try again.");
    }
    final code = res.statusCode ?? 0;
    if (code >= 200 && code < 300) return;
    final data = res.data;
    final message = data is Map && data['message'] is String ? data['message'] as String : null;
    throw AuthException(message ?? 'That did not work. Try again later.');
  }
}

final accountApiProvider = Provider<AccountApi>((ref) => AccountApi(ref.watch(authProvider).value?.token));

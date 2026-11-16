import 'package:dio/dio.dart';

/// The signed-in person, as the backend reports it.
class AuthUser {
  const AuthUser({required this.id, required this.name, required this.email});
  final String id;
  final String name;
  final String email;
}

/// A sign-in: the bearer token to send as `Authorization: Bearer <token>`, and who it belongs to.
class AuthSession {
  const AuthSession({required this.token, required this.user});
  final String token;
  final AuthUser user;
}

/// A sign-in that didn't work, with a message fit to show the person.
class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Sign up, sign in, sign out and session lookup against the backend's /api/auth (Better Auth,
/// bearer plugin). Shared by every Flutter app; the app decides where to keep the token.
class AuthClient {
  AuthClient(String baseUrl)
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl,
            connectTimeout: const Duration(seconds: 10),
            receiveTimeout: const Duration(seconds: 15),
            validateStatus: (_) => true,
          ),
        );

  final Dio _dio;

  Future<AuthSession> signIn({required String email, required String password}) =>
      _session('/api/auth/sign-in/email', {'email': email, 'password': password});

  Future<AuthSession> signUp({required String name, required String email, required String password}) =>
      _session('/api/auth/sign-up/email', {'name': name, 'email': email, 'password': password});

  /// The person behind a stored token, or null when it expired or was signed out elsewhere.
  Future<AuthUser?> currentUser(String token) async {
    final res = await _dio.get<Object?>('/api/auth/get-session', options: _bearer(token));
    final data = res.data;
    if (res.statusCode != 200 || data is! Map || data['user'] is! Map) return null;
    return _user(data['user'] as Map);
  }

  Future<void> signOut(String token) async {
    await _dio.post<Object?>('/api/auth/sign-out', data: <String, Object?>{}, options: _bearer(token));
  }

  Future<AuthSession> _session(String path, Map<String, Object?> body) async {
    final Response<Object?> res;
    try {
      res = await _dio.post<Object?>(path, data: body);
    } on DioException {
      throw AuthException("Can't reach the server. Check your connection and try again.");
    }
    final data = res.data;
    final token = res.headers.value('set-auth-token');
    if (res.statusCode == 200 && token != null && data is Map && data['user'] is Map) {
      return AuthSession(token: token, user: _user(data['user'] as Map));
    }
    final message = data is Map && data['message'] is String ? data['message'] as String : null;
    throw AuthException(message ?? 'That did not work. Check your details and try again.');
  }

  Options _bearer(String token) => Options(headers: {'Authorization': 'Bearer $token'});

  AuthUser _user(Map<dynamic, dynamic> u) => AuthUser(
        id: '${u['id']}',
        name: '${u['name'] ?? ''}',
        email: '${u['email'] ?? ''}',
      );
}

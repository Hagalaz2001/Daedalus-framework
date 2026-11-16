import 'package:app_core/app_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_provider.dart';

/// Where the sign-in token is kept: the platform keychain / keystore, never plain preferences.
abstract class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  static const _key = 'auth_token';
  final _storage = const FlutterSecureStorage();
  @override
  Future<String?> read() => _storage.read(key: _key);
  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);
  @override
  Future<void> clear() => _storage.delete(key: _key);
}

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());
final authClientProvider = Provider<AuthClient>((ref) => AuthClient(apiBaseUrl));

/// The current sign-in (null = signed out). Restores a stored token at start-up.
class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  Future<AuthSession?> build() async {
    final token = await ref.read(tokenStoreProvider).read();
    if (token == null) return null;
    final user = await ref.read(authClientProvider).currentUser(token).catchError((_) => null);
    if (user == null) {
      await ref.read(tokenStoreProvider).clear();
      return null;
    }
    return AuthSession(token: token, user: user);
  }

  Future<void> signIn(String email, String password) => _start(
        () => ref.read(authClientProvider).signIn(email: email, password: password),
      );

  Future<void> signUp(String name, String email, String password) => _start(
        () => ref.read(authClientProvider).signUp(name: name, email: email, password: password),
      );

  Future<void> signOut() async {
    final token = state.value?.token;
    state = const AsyncData(null);
    await ref.read(tokenStoreProvider).clear();
    if (token != null) await ref.read(authClientProvider).signOut(token).catchError((_) {});
  }

  Future<void> _start(Future<AuthSession> Function() action) async {
    final session = await action();
    await ref.read(tokenStoreProvider).write(session.token);
    state = AsyncData(session);
  }
}

final authProvider = AsyncNotifierProvider<AuthController, AuthSession?>(AuthController.new);

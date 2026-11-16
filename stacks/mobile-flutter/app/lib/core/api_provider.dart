import 'package:app_core/app_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_provider.dart';

/// Backend URL. Override per build: `flutter run --dart-define=API_BASE_URL=https://api.example.com`.
/// The default reaches a backend on your PC from the Android emulator (10.0.2.2 = host machine).
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8787');

/// Generated from contracts/openapi.yaml by `deno task sync`, sending the signed-in person's token.
final apiClientProvider = Provider<ApiClient>((ref) {
  final token = ref.watch(authProvider).value?.token;
  return createApiClient(apiBaseUrl, bearerToken: token);
});

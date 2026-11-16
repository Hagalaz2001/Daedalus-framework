import 'package:dio/dio.dart';

import 'api/api_client.dart';

/// The generated API client for a base URL, so apps don't need to depend on Dio themselves.
/// Timeouts make an unreachable server show the screen's error state instead of spinning forever.
ApiClient createApiClient(String baseUrl, {String? bearerToken}) => ApiClient(
      Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
          sendTimeout: const Duration(seconds: 15),
          headers: {if (bearerToken != null) 'Authorization': 'Bearer $bearerToken'},
        ),
      ),
    );

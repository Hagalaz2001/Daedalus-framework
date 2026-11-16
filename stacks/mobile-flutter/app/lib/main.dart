import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import 'app_shell.dart';
import 'core/auth_provider.dart';
import 'core/preferences.dart';
import 'features/auth/auth.dart';
import 'features/onboarding/onboarding.dart';
import 'shared/theme/forui_theme.dart';

void main() {
  runApp(const ProviderScope(child: App()));
}

class App extends ConsumerWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final onboarded = ref.watch(onboardedProvider);
    final mode = ref.watch(themeModeProvider);
    final light = appFTheme(Brightness.light);
    final dark = appFTheme(Brightness.dark);
    return MaterialApp(
      title: 'App',
      debugShowCheckedModeBanner: false,
      theme: appMaterialTheme(Brightness.light),
      darkTheme: appMaterialTheme(Brightness.dark),
      themeMode: mode,
      localizationsDelegates: FLocalizations.localizationsDelegates,
      supportedLocales: FLocalizations.supportedLocales,
      builder: (context, child) {
        final brightness = Theme.of(context).brightness;
        return FTheme(data: brightness == Brightness.dark ? dark : light, child: FToaster(child: child!));
      },
      home: auth.isLoading || onboarded.isLoading
          ? const Scaffold(body: Center(child: FCircularProgress()))
          : auth.value != null
              ? const AppShell()
              : onboarded.value == true
                  ? const SignInPage()
                  : OnboardingPage(onDone: () => ref.read(onboardedProvider.notifier).complete()),
    );
  }
}

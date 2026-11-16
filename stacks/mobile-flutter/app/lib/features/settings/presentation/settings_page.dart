import 'package:flutter/material.dart' show ThemeMode;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/auth_provider.dart';
import '../../../core/preferences.dart';
import '../../../shared/ui/navigation.dart';
import '../../../shared/ui/ui.dart';
import '../../profile/profile.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;
    final user = ref.watch(authProvider).value?.user;
    final label = theme.typography.body.xs.copyWith(color: theme.colors.mutedForeground, fontWeight: FontWeight.w600);
    return AppPage(
      title: 'Settings',
      children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, spacing: 8, children: [
          Text('ACCOUNT', style: label),
          AppListRow(
            leading: const Icon(FLucideIcons.circleUserRound),
            title: user?.name ?? 'Profile',
            subtitle: user?.email,
            onPress: () => pushPage<void>(context, const ProfilePage()),
          ),
        ]),
        Column(crossAxisAlignment: CrossAxisAlignment.start, spacing: 8, children: [
          Text('APPEARANCE', style: label),
          AppSelect<ThemeMode>(
            label: 'Theme',
            value: ref.watch(themeModeProvider),
            options: const [AppOption(ThemeMode.system, 'Match device'), AppOption(ThemeMode.light, 'Light'), AppOption(ThemeMode.dark, 'Dark')],
            onChanged: (m) => ref.read(themeModeProvider.notifier).set(m),
          ),
        ]),
        Column(crossAxisAlignment: CrossAxisAlignment.start, spacing: 8, children: [
          Text('ABOUT', style: label),
          const AppListRow(leading: Icon(FLucideIcons.info), title: 'Version', trailing: Text('1.0.0')),
        ]),
        AppButton(
          label: 'Sign out',
          variant: AppButtonVariant.secondary,
          icon: FLucideIcons.logOut,
          onPressed: () async {
            final ok = await showAppDialog(context, title: 'Sign out?', message: 'You will need to sign in again to see your notes.', confirmLabel: 'Sign out');
            if (ok) await ref.read(authProvider.notifier).signOut();
          },
        ),
      ],
    );
  }
}

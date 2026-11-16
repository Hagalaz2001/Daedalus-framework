import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/account_api.dart';
import '../../../core/auth_provider.dart';
import '../../../core/errors.dart';
import '../../../shared/ui/ui.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  bool _busy = false;

  Future<void> _delete() async {
    final ok = await showAppDialog(
      context,
      title: 'Delete your account?',
      message: 'All of your notes will be erased immediately.',
      confirmLabel: 'Delete forever',
      destructive: true,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(accountApiProvider).deleteAccount();
      if (!mounted) return;
      Navigator.of(context).popUntil((r) => r.isFirst);
      await ref.read(authProvider.notifier).signOut();
    } catch (e) {
      if (mounted) showAppToast(context, friendlyError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    final user = ref.watch(authProvider).value?.user;
    final emailController = TextEditingController(text: user?.email ?? '');
    return AppPage(
      title: 'Profile',
      onBack: () => Navigator.of(context).pop(),
      children: [
        Column(
          spacing: 8,
          children: [
            AppAvatar(name: user?.name ?? '?', size: AppAvatarSize.lg),
            Text(user?.name ?? '', style: theme.typography.body.xl2.copyWith(fontWeight: FontWeight.w700)),
            const AppBadge(label: 'Signed in'),
          ],
        ),
        AppTextField(label: 'Email', controller: emailController, enabled: false, hint: 'Contact support to change your email.'),
        AppCard(
          danger: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              Text('Delete account', style: theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600, color: theme.colors.destructive)),
              Text(
                'Permanently removes your account and every note in it. This cannot be undone.',
                style: theme.typography.body.sm.copyWith(color: theme.colors.mutedForeground),
              ),
              AppButton(label: 'Delete my account', variant: AppButtonVariant.danger, loading: _busy, onPressed: _delete),
            ],
          ),
        ),
      ],
    );
  }
}

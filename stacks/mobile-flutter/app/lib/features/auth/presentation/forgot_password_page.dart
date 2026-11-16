import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/account_api.dart';
import '../../../core/errors.dart';
import '../../../shared/ui/ui.dart';

class ForgotPasswordPage extends ConsumerStatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  ConsumerState<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends ConsumerState<ForgotPasswordPage> {
  final _email = TextEditingController();
  String? _error;
  bool _sent = false;
  bool _busy = false;

  Future<void> _submit() async {
    final e = validateEmail(_email.text);
    setState(() => _error = e);
    if (e != null) return;
    setState(() => _busy = true);
    try {
      await ref.read(accountApiProvider).requestPasswordReset(_email.text.trim());
      if (mounted) setState(() => _sent = true);
    } catch (err) {
      if (mounted) setState(() => _error = friendlyError(err));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    return AppPage(
      title: 'Reset password',
      onBack: () => Navigator.of(context).pop(),
      children: _sent
          ? [
              Text('Check your inbox', style: theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600)),
              Text('If an account exists for ${_email.text.trim()}, we sent a link to choose a new password.', style: TextStyle(color: theme.colors.mutedForeground)),
              AppButton(label: 'Back to sign in', onPressed: () => Navigator.of(context).pop()),
            ]
          : [
              Text('Enter the email you signed up with and we will send you a reset link.', style: TextStyle(color: theme.colors.mutedForeground)),
              AppTextField(label: 'Email', controller: _email, error: _error, keyboardType: TextInputType.emailAddress, onSubmitted: _submit),
              AppButton(label: 'Send reset link', loading: _busy, onPressed: _submit),
            ],
    );
  }
}

import 'package:flutter/services.dart' show TextInputAction;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/auth_provider.dart';
import '../../../core/errors.dart';
import '../../../shared/ui/navigation.dart';
import '../../../shared/ui/ui.dart';
import 'forgot_password_page.dart';
import 'sign_up_page.dart';

class SignInPage extends ConsumerStatefulWidget {
  const SignInPage({super.key});

  @override
  ConsumerState<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends ConsumerState<SignInPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _emailError;
  String? _passwordError;
  String? _formError;
  bool _busy = false;

  Future<void> _submit() async {
    final e = validateEmail(_email.text);
    final p = _password.text.isEmpty ? 'Enter your password.' : null;
    setState(() {
      _emailError = e;
      _passwordError = p;
      _formError = null;
    });
    if (e != null || p != null) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).signIn(_email.text.trim(), _password.text);
    } catch (err) {
      if (mounted) setState(() => _formError = friendlyError(err));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    return AppPage(
      children: [
        const SizedBox(height: 32),
        Semantics(header: true, child: Text('Welcome back', style: theme.typography.body.xl3.copyWith(fontWeight: FontWeight.w700))),
        Text('Sign in to pick up where you left off.', style: TextStyle(color: theme.colors.mutedForeground)),
        const SizedBox(height: 8),
        AppTextField(
          label: 'Email',
          controller: _email,
          error: _emailError,
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.next,
        ),
        AppTextField(
          label: 'Password',
          controller: _password,
          error: _passwordError,
          obscureText: true,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: _submit,
        ),
        if (_formError != null) Semantics(liveRegion: true, child: Text(_formError!, style: TextStyle(color: theme.colors.destructive))),
        AppButton(label: 'Sign in', loading: _busy, onPressed: _submit),
        AppButton(label: 'Forgot password?', variant: AppButtonVariant.ghost, onPressed: () => pushPage<void>(context, const ForgotPasswordPage())),
        const SizedBox(height: 24),
        AppButton(
          label: 'New here? Create an account',
          variant: AppButtonVariant.secondary,
          onPressed: () => pushPage<void>(context, const SignUpPage()),
        ),
      ],
    );
  }
}

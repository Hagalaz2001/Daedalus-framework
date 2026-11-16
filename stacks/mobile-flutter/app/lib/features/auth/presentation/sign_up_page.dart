import 'package:flutter/services.dart' show TextInputAction;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/auth_provider.dart';
import '../../../core/errors.dart';
import '../../../shared/ui/ui.dart';

class SignUpPage extends ConsumerStatefulWidget {
  const SignUpPage({super.key});

  @override
  ConsumerState<SignUpPage> createState() => _SignUpPageState();
}

class _SignUpPageState extends ConsumerState<SignUpPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _nameError;
  String? _emailError;
  String? _passwordError;
  String? _formError;
  bool _busy = false;

  Future<void> _submit() async {
    final n = validateName(_name.text);
    final e = validateEmail(_email.text);
    final p = validatePassword(_password.text);
    setState(() {
      _nameError = n;
      _emailError = e;
      _passwordError = p;
      _formError = null;
    });
    if (n != null || e != null || p != null) return;
    setState(() => _busy = true);
    try {
      await ref.read(authProvider.notifier).signUp(_name.text.trim(), _email.text.trim(), _password.text);
      // The app root swaps to the signed-in shell; drop this screen from the back stack.
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (err) {
      if (mounted) setState(() => _formError = friendlyError(err));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AppPage(
        title: 'Create account',
        onBack: () => Navigator.of(context).pop(),
        children: [
          AppTextField(label: 'Name', controller: _name, error: _nameError, autofillHints: const [AutofillHints.name], textInputAction: TextInputAction.next),
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
            hint: 'At least 8 characters.',
            obscureText: true,
            autofillHints: const [AutofillHints.newPassword],
            onSubmitted: _submit,
          ),
          if (_formError != null) Semantics(liveRegion: true, child: Text(_formError!, style: TextStyle(color: context.theme.colors.destructive))),
          AppButton(label: 'Create account', loading: _busy, onPressed: _submit),
          AppButton(label: 'I already have an account', variant: AppButtonVariant.ghost, onPressed: () => Navigator.of(context).pop()),
        ],
      );
}

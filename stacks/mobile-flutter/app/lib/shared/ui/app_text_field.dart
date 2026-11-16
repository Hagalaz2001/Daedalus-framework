import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

/// Labelled text field (Forui FTextField) with an inline error. Owns nothing: pass your [controller].
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    this.error,
    this.hint,
    this.keyboardType,
    this.obscureText = false,
    this.autofillHints,
    this.textInputAction,
    this.onSubmitted,
    this.maxLines = 1,
    this.minLines,
    this.maxLength,
    this.enabled = true,
    this.inputFormatters,
  });

  final String label;
  final TextEditingController controller;
  final String? error;
  final String? hint;
  final TextInputType? keyboardType;
  final bool obscureText;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final VoidCallback? onSubmitted;
  final int? maxLines;
  final int? minLines;
  final int? maxLength;
  final bool enabled;
  final List<TextInputFormatter>? inputFormatters;

  @override
  Widget build(BuildContext context) => FTextField(
        control: FTextFieldControl.managed(controller: controller),
        label: Text(label),
        description: hint == null ? null : Text(hint!),
        error: error == null ? null : Text(error!),
        keyboardType: keyboardType,
        obscureText: obscureText,
        autofillHints: autofillHints,
        textInputAction: textInputAction,
        onSubmit: onSubmitted == null ? null : (_) => onSubmitted!(),
        maxLines: maxLines,
        minLines: minLines,
        maxLength: maxLength,
        enabled: enabled,
        inputFormatters: inputFormatters,
        autocorrect: !obscureText && keyboardType != TextInputType.emailAddress,
      );
}

import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }

/// Full-width button (Forui FButton) with a loading state. Pass [onPressed] null to disable.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.loading = false,
    this.icon,
    this.block = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool loading;
  final IconData? icon;
  final bool block;

  @override
  Widget build(BuildContext context) {
    final button = FButton(
      onPress: loading ? null : onPressed,
      variant: switch (variant) {
        AppButtonVariant.primary => FButtonVariant.primary,
        AppButtonVariant.secondary => FButtonVariant.outline,
        AppButtonVariant.ghost => FButtonVariant.ghost,
        AppButtonVariant.danger => FButtonVariant.destructive,
      },
      semanticsLabel: label,
      prefix: loading ? const FCircularProgress() : (icon == null ? null : Icon(icon)),
      mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min,
      child: Text(label),
    );
    return block ? SizedBox(width: double.infinity, child: button) : button;
  }
}

/// Icon-only button. [label] is required: it is what screen readers announce.
class AppIconButton extends StatelessWidget {
  const AppIconButton({super.key, required this.icon, required this.label, required this.onPressed});

  final IconData icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) => FButton.icon(
        onPress: onPressed,
        variant: FButtonVariant.ghost,
        semanticsLabel: label,
        child: Icon(icon),
      );
}

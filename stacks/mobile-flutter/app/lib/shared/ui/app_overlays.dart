import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import 'app_button.dart';

/// Confirmation dialog. Resolves to true when confirmed. Use it for decisions that must not happen by accident.
Future<bool> showAppDialog(
  BuildContext context, {
  required String title,
  String? message,
  required String confirmLabel,
  String cancelLabel = 'Cancel',
  bool destructive = false,
}) async {
  final result = await showFDialog<bool>(
    context: context,
    builder: (context, style, animation) => FDialog(
      style: style,
      animation: animation,
      builder: (context, style) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          spacing: 12,
          children: [
            Text(title, style: style.titleTextStyle),
            if (message != null) Text(message, style: style.bodyTextStyle),
            const SizedBox(height: 4),
            AppButton(
              label: confirmLabel,
              variant: destructive ? AppButtonVariant.danger : AppButtonVariant.primary,
              onPressed: () => Navigator.of(context).pop(true),
            ),
            AppButton(label: cancelLabel, variant: AppButtonVariant.ghost, onPressed: () => Navigator.of(context).pop(false)),
          ],
        ),
      ),
    ),
  );
  return result ?? false;
}

/// Bottom sheet for pickers and secondary actions.
Future<T?> showAppSheet<T>(BuildContext context, {required String title, required WidgetBuilder builder}) => showFSheet<T>(
      context: context,
      side: FLayout.btt,
      builder: (sheetContext) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: sheetContext.theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Flexible(child: SingleChildScrollView(child: builder(sheetContext))),
          ],
        ),
      ),
    );

/// Short message at the bottom of the screen; disappears by itself.
void showAppToast(BuildContext context, String message, {bool error = false}) {
  showFToast(
    context: context,
    variant: error ? FToastVariant.destructive : FToastVariant.primary,
    title: Text(message),
    alignment: FToastAlignment.bottomCenter,
  );
}

import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import 'app_overlays.dart';
import 'app_surfaces.dart';

class AppCheckbox extends StatelessWidget {
  const AppCheckbox({super.key, required this.label, required this.value, required this.onChanged, this.description});

  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => FCheckbox(
        label: Text(label),
        description: description == null ? null : Text(description!),
        semanticsLabel: label,
        value: value,
        onChange: onChanged,
      );
}

class AppSwitch extends StatelessWidget {
  const AppSwitch({super.key, required this.label, required this.value, required this.onChanged, this.description});

  final String label;
  final String? description;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => FSwitch(
        label: Text(label),
        description: description == null ? null : Text(description!),
        semanticsLabel: label,
        value: value,
        onChange: onChanged,
      );
}

class AppOption<T> {
  const AppOption(this.value, this.label);
  final T value;
  final String label;
}

/// Picker that opens a bottom sheet: the same on every platform, with large touch targets.
class AppSelect<T> extends StatelessWidget {
  const AppSelect({super.key, required this.label, required this.value, required this.options, required this.onChanged});

  final String label;
  final T value;
  final List<AppOption<T>> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final current = options.firstWhere((o) => o.value == value, orElse: () => options.first);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 4,
      children: [
        Text(label, style: context.theme.typography.body.sm.copyWith(fontWeight: FontWeight.w600)),
        DecoratedBox(
          decoration: BoxDecoration(border: Border.all(color: context.theme.colors.border), borderRadius: BorderRadius.circular(10)),
          child: AppListRow(
            title: current.label,
            semanticsLabel: '$label: ${current.label}',
            trailing: Icon(FLucideIcons.chevronDown, color: context.theme.colors.mutedForeground),
            onPress: () => showAppSheet<void>(
              context,
              title: label,
              builder: (sheetContext) => Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final o in options)
                    AppListRow(
                      title: o.label,
                      trailing: o.value == value ? Icon(FLucideIcons.check, color: context.theme.colors.primary) : null,
                      onPress: () {
                        Navigator.of(sheetContext).pop();
                        onChanged(o.value);
                      },
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

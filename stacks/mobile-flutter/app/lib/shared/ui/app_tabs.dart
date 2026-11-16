import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

/// Pill filters for switching a list between views (screen-level navigation uses the bottom bar).
class AppFilterTabs<T> extends StatelessWidget {
  const AppFilterTabs({super.key, required this.items, required this.value, required this.onChanged});

  final List<({T value, String label})> items;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = context.theme.colors;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        spacing: 8,
        children: [
          for (final it in items)
            Semantics(
              button: true,
              selected: it.value == value,
              label: it.label,
              excludeSemantics: true,
              child: GestureDetector(
                onTap: () => onChanged(it.value),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
                  child: Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: it.value == value ? colors.primary : colors.muted,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: it.value == value ? colors.primary : colors.border),
                    ),
                    child: Text(
                      it.label,
                      style: context.theme.typography.body.sm.copyWith(
                        fontWeight: FontWeight.w600,
                        color: it.value == value ? colors.primaryForeground : colors.foreground,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import '../../../shared/ui/ui.dart';

class _Step {
  const _Step(this.icon, this.title, this.body);
  final IconData icon;
  final String title;
  final String body;
}

const _steps = [
  _Step(FLucideIcons.penLine, 'Capture in seconds', 'Jot a thought the moment you have it. No folders, no fuss.'),
  _Step(FLucideIcons.search, 'Find it again', 'Search and filter your notes so the right one is always close.'),
  _Step(FLucideIcons.lock, 'Yours alone', 'Your notes sit behind your account and are never shared.'),
];

/// First-run introduction. [onDone] runs on "Get started" and "Skip".
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  int _i = 0;

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    final step = _steps[_i];
    final last = _i == _steps.length - 1;
    return AppPage(
      expandChildren: true,
      footer: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 8,
        children: [
          AppButton(label: last ? 'Get started' : 'Next', onPressed: () => last ? widget.onDone() : setState(() => _i++)),
          if (!last) AppButton(label: 'Skip', variant: AppButtonVariant.ghost, onPressed: widget.onDone),
        ],
      ),
      children: [
        Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              spacing: 16,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(color: theme.colors.muted, shape: BoxShape.circle),
                  child: Icon(step.icon, size: 56, color: theme.colors.primary),
                ),
                Semantics(
                  header: true,
                  child: Text(step.title, textAlign: TextAlign.center, style: theme.typography.body.xl3.copyWith(fontWeight: FontWeight.w700)),
                ),
                Text(step.body, textAlign: TextAlign.center, style: TextStyle(color: theme.colors.mutedForeground)),
                const SizedBox(height: 8),
                Semantics(
                  label: 'Step ${_i + 1} of ${_steps.length}',
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    spacing: 8,
                    children: [
                      for (var n = 0; n < _steps.length; n++)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          width: n == _i ? 24 : 8,
                          height: 8,
                          decoration: BoxDecoration(color: n == _i ? theme.colors.primary : theme.colors.border, borderRadius: BorderRadius.circular(4)),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

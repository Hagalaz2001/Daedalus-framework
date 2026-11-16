import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import 'app_button.dart';

/// A pulsing placeholder block shown while content loads.
class AppSkeleton extends StatefulWidget {
  const AppSkeleton({super.key, this.height = 16, this.width});

  final double height;
  final double? width;

  @override
  State<AppSkeleton> createState() => _AppSkeletonState();
}

class _AppSkeletonState extends State<AppSkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: FadeTransition(
          opacity: Tween<double>(begin: 0.5, end: 1).animate(_controller),
          child: Container(
            height: widget.height,
            width: widget.width,
            decoration: BoxDecoration(color: context.theme.colors.border, borderRadius: BorderRadius.circular(4)),
          ),
        ),
      );
}

/// Placeholder rows shown while a list loads.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.rows = 5});

  final int rows;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Loading',
        child: Column(
          spacing: 16,
          children: [
            for (var i = 0; i < rows; i++)
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 8,
                children: [AppSkeleton(height: 18, width: 220), AppSkeleton(height: 14, width: 140)],
              ),
          ],
        ),
      );
}

class _Centered extends StatelessWidget {
  const _Centered({required this.icon, required this.tint, required this.title, this.message, this.actionLabel, this.onAction});

  final IconData icon;
  final Color tint;
  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colors = context.theme.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: 12,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(color: colors.muted, shape: BoxShape.circle),
              child: Icon(icon, size: 32, color: tint),
            ),
            Text(title, textAlign: TextAlign.center, style: context.theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600)),
            if (message != null) Text(message!, textAlign: TextAlign.center, style: TextStyle(color: colors.mutedForeground)),
            if (actionLabel != null && onAction != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: AppButton(label: actionLabel!, onPressed: onAction, block: false),
              ),
          ],
        ),
      ),
    );
  }
}

/// Nothing here yet: say why and offer the next step.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.message, this.actionLabel, this.onAction, this.icon});

  final String title;
  final String? message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => _Centered(
        icon: icon ?? FLucideIcons.inbox,
        tint: context.theme.colors.mutedForeground,
        title: title,
        message: message,
        actionLabel: actionLabel,
        onAction: onAction,
      );
}

/// Something failed: say what in plain words and offer a retry.
class ErrorState extends StatelessWidget {
  const ErrorState({super.key, this.title = 'Something went wrong', this.message, this.actionLabel = 'Try again', this.onAction});

  final String title;
  final String? message;
  final String actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Semantics(
        liveRegion: true,
        child: _Centered(
          icon: FLucideIcons.cloudOff,
          tint: context.theme.colors.destructive,
          title: title,
          message: message,
          actionLabel: onAction == null ? null : actionLabel,
          onAction: onAction,
        ),
      );
}

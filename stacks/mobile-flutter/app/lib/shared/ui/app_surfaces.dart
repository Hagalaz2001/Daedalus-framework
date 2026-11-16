import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

class AppCard extends StatelessWidget {
  const AppCard({super.key, required this.child, this.danger = false});

  final Widget child;

  /// Red outline, for destructive areas such as "Delete account".
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final card = FCard(child: Padding(padding: const EdgeInsets.all(16), child: child));
    if (!danger) return card;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: context.theme.colors.destructive),
        borderRadius: BorderRadius.circular(12),
      ),
      child: card,
    );
  }
}

/// A tappable (or static) row: leading visual, title and subtitle, trailing content.
class AppListRow extends StatelessWidget {
  const AppListRow({
    super.key,
    required this.title,
    this.subtitle,
    this.leading,
    this.trailing,
    this.onPress,
    this.destructive = false,
    this.semanticsLabel,
  });

  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onPress;
  final bool destructive;
  final String? semanticsLabel;

  @override
  Widget build(BuildContext context) {
    final colors = context.theme.colors;
    return FItem(
      prefix: leading,
      title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: destructive ? TextStyle(color: colors.destructive) : null),
      subtitle: subtitle == null ? null : Text(subtitle!, maxLines: 2, overflow: TextOverflow.ellipsis),
      suffix: trailing ?? (onPress == null ? null : Icon(FLucideIcons.chevronRight, color: colors.mutedForeground)),
      semanticsLabel: semanticsLabel ?? (subtitle == null ? title : '$title, $subtitle'),
      onPress: onPress,
    );
  }
}

enum AppAvatarSize { sm, md, lg }

class AppAvatar extends StatelessWidget {
  const AppAvatar({super.key, required this.name, this.size = AppAvatarSize.md});

  final String name;
  final AppAvatarSize size;

  @override
  Widget build(BuildContext context) {
    final px = switch (size) { AppAvatarSize.sm => 32.0, AppAvatarSize.md => 44.0, AppAvatarSize.lg => 72.0 };
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).take(2);
    final initials = parts.map((p) => p[0].toUpperCase()).join();
    final colors = context.theme.colors;
    return Semantics(
      label: 'Avatar for $name',
      image: true,
      excludeSemantics: true,
      child: FAvatar.raw(
        size: px,
        child: ColoredBox(
          color: colors.primary,
          child: Center(
            child: Text(
              initials.isEmpty ? '?' : initials,
              textScaler: TextScaler.noScaling,
              style: TextStyle(color: colors.primaryForeground, fontSize: px * 0.38, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      ),
    );
  }
}

enum AppBadgeTone { neutral, primary, success, warning, danger }

class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.label, this.tone = AppBadgeTone.neutral});

  final String label;
  final AppBadgeTone tone;

  @override
  Widget build(BuildContext context) => FBadge(
        variant: switch (tone) {
          AppBadgeTone.neutral => FBadgeVariant.outline,
          AppBadgeTone.primary => FBadgeVariant.primary,
          AppBadgeTone.success => FBadgeVariant.secondary,
          AppBadgeTone.warning => FBadgeVariant.secondary,
          AppBadgeTone.danger => FBadgeVariant.destructive,
        },
        child: Text(label),
      );
}

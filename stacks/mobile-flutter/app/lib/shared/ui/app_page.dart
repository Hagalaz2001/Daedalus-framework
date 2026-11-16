import 'package:flutter/material.dart' show RefreshIndicator;
import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import 'app_button.dart';

/// Page title row with an optional back button and trailing action.
class AppPageHeader extends StatelessWidget {
  const AppPageHeader({super.key, required this.title, this.subtitle, this.onBack, this.action});

  final String title;
  final String? subtitle;
  final VoidCallback? onBack;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final type = context.theme.typography;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Row(
        spacing: 8,
        children: [
          if (onBack != null) AppIconButton(icon: FLucideIcons.arrowLeft, label: 'Back', onPressed: onBack),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Semantics(
                  header: true,
                  child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: type.body.xl2.copyWith(fontWeight: FontWeight.w700)),
                ),
                if (subtitle != null) Text(subtitle!, style: type.body.sm.copyWith(color: context.theme.colors.mutedForeground)),
              ],
            ),
          ),
          if (action != null) action!,
        ],
      ),
    );
  }
}

/// App shell for a screen: safe areas, page header, scrolling (optional), pull to refresh and a pinned footer.
class AppPage extends StatelessWidget {
  const AppPage({
    super.key,
    required this.children,
    this.title,
    this.subtitle,
    this.onBack,
    this.action,
    this.footer,
    this.onRefresh,
    this.expandChildren = false,
  });

  final List<Widget> children;
  final String? title;
  final String? subtitle;
  final VoidCallback? onBack;
  final Widget? action;
  final Widget? footer;
  final Future<void> Function()? onRefresh;

  /// Let a single child (a list) fill the remaining height instead of scrolling the whole page.
  final bool expandChildren;

  @override
  Widget build(BuildContext context) {
    final header = title == null
        ? null
        : Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: AppPageHeader(title: title!, subtitle: subtitle, onBack: onBack, action: action),
          );
    final Widget body;
    if (expandChildren) {
      body = Column(children: [?header, Expanded(child: children.first)]);
    } else {
      Widget scroll = ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        children: [
          ?header,
          Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, spacing: 16, children: children)),
        ],
      );
      if (onRefresh != null) scroll = RefreshIndicator(onRefresh: onRefresh!, child: scroll);
      body = scroll;
    }
    return FScaffold(
      childPad: false,
      child: SafeArea(
        child: Column(
          children: [
            Expanded(child: body),
            if (footer != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: context.theme.colors.border))),
                child: footer,
              ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/auth_provider.dart';
import '../../../core/errors.dart';
import '../../../shared/ui/navigation.dart';
import '../../../shared/ui/ui.dart';
import '../../notes/notes.dart';
import '../../profile/profile.dart';

/// Dashboard: greeting, headline numbers and the latest notes, with all four data states.
/// [onSeeAll] switches the shell to the notes tab.
class HomePage extends ConsumerWidget {
  const HomePage({super.key, required this.onSeeAll});

  final VoidCallback onSeeAll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = context.theme;
    final name = ref.watch(authProvider).value?.user.name ?? 'there';
    final notes = ref.watch(notesProvider);
    return AppPage(
      onRefresh: () => ref.refresh(notesProvider.future),
      children: [
        Row(
          spacing: 12,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Good to see you', style: theme.typography.body.sm.copyWith(color: theme.colors.mutedForeground)),
                  Semantics(header: true, child: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.typography.body.xl3.copyWith(fontWeight: FontWeight.w700))),
                ],
              ),
            ),
            Semantics(
              button: true,
              label: 'Open profile',
              excludeSemantics: true,
              child: GestureDetector(onTap: () => pushPage<void>(context, const ProfilePage()), child: SizedBox.square(dimension: 48, child: Center(child: AppAvatar(name: name)))),
            ),
          ],
        ),
        notes.when(
          loading: () => const Column(
            spacing: 12,
            children: [
              Row(spacing: 12, children: [Expanded(child: AppSkeleton(height: 88)), Expanded(child: AppSkeleton(height: 88))]),
              Align(alignment: Alignment.centerLeft, child: AppSkeleton(height: 20, width: 120)),
              AppSkeleton(height: 56),
            ],
          ),
          error: (e, _) => ErrorState(message: friendlyError(e), onAction: () => ref.invalidate(notesProvider)),
          data: (all) {
            final today = all.where((n) => DateTime.now().difference(n.createdAt).inHours < 24).length;
            final recent = all.take(3).toList();
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              spacing: 16,
              children: [
                Row(spacing: 12, children: [Expanded(child: _Stat('Total notes', all.length)), Expanded(child: _Stat('Added today', today))]),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Latest', style: theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600)),
                    if (recent.isNotEmpty) AppButton(label: 'See all', variant: AppButtonVariant.ghost, block: false, onPressed: onSeeAll),
                  ],
                ),
                if (recent.isEmpty)
                  EmptyState(
                    title: 'Nothing here yet',
                    message: 'Notes you add show up here.',
                    actionLabel: 'Add a note',
                    onAction: () => pushPage<void>(context, const NoteFormPage()),
                  )
                else
                  for (final n in recent)
                    AppListRow(title: n.text, subtitle: formatNoteDate(n.createdAt), onPress: () => pushPage<void>(context, NoteDetailPage(id: n.id))),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value);

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    return Semantics(
      label: '$label: $value',
      excludeSemantics: true,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$value', style: theme.typography.body.xl3.copyWith(fontWeight: FontWeight.w700)),
            Text(label, style: theme.typography.body.sm.copyWith(color: theme.colors.mutedForeground)),
          ],
        ),
      ),
    );
  }
}

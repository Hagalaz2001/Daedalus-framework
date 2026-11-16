import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/errors.dart';
import '../../../shared/ui/ui.dart';
import '../data/note_filter.dart';
import '../data/notes_repository.dart';

class NoteDetailPage extends ConsumerWidget {
  const NoteDetailPage({super.key, required this.id});

  final String id;

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final ok = await showAppDialog(
      context,
      title: 'Delete this note?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    );
    if (!ok || !context.mounted) return;
    try {
      await ref.read(notesRepositoryProvider).delete(id);
      ref.invalidate(notesProvider);
      if (!context.mounted) return;
      showAppToast(context, 'Note deleted');
      Navigator.of(context).pop();
    } catch (e) {
      if (context.mounted) showAppToast(context, friendlyError(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notes = ref.watch(notesProvider);
    final theme = context.theme;
    final note = notes.value?.where((n) => n.id == id).firstOrNull;
    return AppPage(
      title: 'Note',
      onBack: () => Navigator.of(context).pop(),
      action: note == null ? null : AppIconButton(icon: FLucideIcons.trash2, label: 'Delete note', onPressed: () => _delete(context, ref)),
      children: [
        notes.when(
          loading: () => const Column(spacing: 12, children: [AppSkeleton(height: 20), AppSkeleton(height: 20, width: 240)]),
          error: (e, _) => ErrorState(message: friendlyError(e), onAction: () => ref.invalidate(notesProvider)),
          data: (_) => note == null
              ? EmptyState(title: 'Note not found', message: 'It may have been deleted.', actionLabel: 'Go back', onAction: () => Navigator.of(context).pop())
              : AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 12,
                    children: [
                      Text(note.text, style: theme.typography.body.lg.copyWith(fontWeight: FontWeight.w600)),
                      Text('Created ${formatNoteDate(note.createdAt)}', style: theme.typography.body.sm.copyWith(color: theme.colors.mutedForeground)),
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}

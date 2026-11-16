import 'package:flutter/material.dart' show RefreshIndicator;
import 'package:flutter/services.dart' show TextInputAction;
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:forui/forui.dart';

import '../../../core/errors.dart';
import '../../../shared/ui/navigation.dart';
import '../../../shared/ui/ui.dart';
import '../data/note_filter.dart';
import '../data/notes_repository.dart';
import 'note_detail_page.dart';
import 'note_form_page.dart';

/// List + search + filters. Loading, empty, no-results and error each have their own state.
class NotesListPage extends ConsumerStatefulWidget {
  const NotesListPage({super.key});

  @override
  ConsumerState<NotesListPage> createState() => _NotesListPageState();
}

class _NotesListPageState extends ConsumerState<NotesListPage> {
  final _search = TextEditingController();
  NoteRange _range = NoteRange.all;
  NoteSort _sort = NoteSort.newest;

  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notes = ref.watch(notesProvider);
    return AppPage(
      title: 'Notes',
      subtitle: notes.value == null ? null : '${notes.value!.length} in total',
      action: AppIconButton(icon: FLucideIcons.circlePlus, label: 'New note', onPressed: () => pushPage<void>(context, const NoteFormPage())),
      expandChildren: true,
      children: [
        notes.when(
          loading: () => const Padding(padding: EdgeInsets.all(16), child: SkeletonList()),
          error: (e, _) => ErrorState(message: friendlyError(e), onAction: () => ref.invalidate(notesProvider)),
          data: (all) {
            final rows = filterNotes(all, _search.text, _range, _sort);
            final filtering = _search.text.trim().isNotEmpty || _range != NoteRange.all;
            return RefreshIndicator(
              onRefresh: () => ref.refresh(notesProvider.future),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: rows.isEmpty ? 2 : rows.length + 1,
                itemBuilder: (context, i) {
                  if (i == 0) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 12,
                        children: [
                          AppTextField(label: 'Search', controller: _search, textInputAction: TextInputAction.search),
                          AppFilterTabs<NoteRange>(
                            value: _range,
                            onChanged: (v) => setState(() => _range = v),
                            items: const [(value: NoteRange.all, label: 'All'), (value: NoteRange.today, label: 'Today'), (value: NoteRange.week, label: 'This week')],
                          ),
                          AppSelect<NoteSort>(
                            label: 'Sort',
                            value: _sort,
                            options: const [AppOption(NoteSort.newest, 'Newest first'), AppOption(NoteSort.oldest, 'Oldest first')],
                            onChanged: (v) => setState(() => _sort = v),
                          ),
                        ],
                      ),
                    );
                  }
                  if (rows.isEmpty) {
                    return filtering
                        ? const EmptyState(icon: FLucideIcons.search, title: 'No matching notes', message: 'Try a different search or filter.')
                        : EmptyState(
                            title: 'No notes yet',
                            message: 'Capture your first note.',
                            actionLabel: 'New note',
                            onAction: () => pushPage<void>(context, const NoteFormPage()),
                          );
                  }
                  final n = rows[i - 1];
                  return AppListRow(
                    title: n.text,
                    subtitle: formatNoteDate(n.createdAt),
                    onPress: () => pushPage<void>(context, NoteDetailPage(id: n.id)),
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }
}

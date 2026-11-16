import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors.dart';
import '../../../shared/ui/ui.dart';
import '../data/notes_repository.dart';

const _maxLength = 500;

/// Create form. The contract has no update operation yet: add `updateNote` to contracts/openapi.yaml, run
/// `deno task sync`, then pass an initial note and call the new repository method to make this create/edit.
class NoteFormPage extends ConsumerStatefulWidget {
  const NoteFormPage({super.key});

  @override
  ConsumerState<NoteFormPage> createState() => _NoteFormPageState();
}

class _NoteFormPageState extends ConsumerState<NoteFormPage> {
  final _text = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _save() async {
    final value = _text.text.trim();
    if (value.isEmpty) return setState(() => _error = 'Write something first.');
    if (value.length > _maxLength) return setState(() => _error = 'Keep it under $_maxLength characters.');
    setState(() {
      _error = null;
      _busy = true;
    });
    try {
      await ref.read(notesRepositoryProvider).create(value);
      ref.invalidate(notesProvider);
      if (!mounted) return;
      showAppToast(context, 'Note saved');
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _text.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AppPage(
        title: 'New note',
        onBack: () => Navigator.of(context).pop(),
        footer: AppButton(label: 'Save note', loading: _busy, onPressed: _save),
        children: [
          AppTextField(
            label: 'Note',
            controller: _text,
            error: _error,
            hint: '${_text.text.length}/$_maxLength',
            maxLines: 8,
            minLines: 5,
          ),
        ],
      );
}

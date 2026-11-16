import 'package:app_core/app_core.dart';

enum NoteRange { all, today, week }

enum NoteSort { newest, oldest }

/// Search text, date range and sort order applied to a list of notes.
List<Note> filterNotes(List<Note> notes, String query, NoteRange range, NoteSort sort, {DateTime? now}) {
  final at = now ?? DateTime.now();
  final q = query.trim().toLowerCase();
  final days = switch (range) { NoteRange.all => null, NoteRange.today => 1, NoteRange.week => 7 };
  final out = notes.where((n) {
    if (q.isNotEmpty && !n.text.toLowerCase().contains(q)) return false;
    return days == null || at.difference(n.createdAt).inHours < days * 24;
  }).toList()
    ..sort((a, b) => sort == NoteSort.newest ? b.createdAt.compareTo(a.createdAt) : a.createdAt.compareTo(b.createdAt));
  return out;
}

String formatNoteDate(DateTime d, {DateTime? now}) {
  final at = now ?? DateTime.now();
  final diff = at.difference(d);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inHours < 24 && d.day == at.day) {
    final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
    return '$h:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'AM' : 'PM'}';
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${months[d.month - 1]} ${d.day}${d.year == at.year ? '' : ', ${d.year}'}';
}

import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

import 'features/home/home.dart';
import 'features/notes/notes.dart';
import 'features/settings/settings.dart';

/// Signed-in shell: three tabs behind a bottom navigation bar. Each tab keeps its state while hidden.
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) => FScaffold(
        childPad: false,
        footer: FBottomNavigationBar(
          index: _index,
          onChange: (i) => setState(() => _index = i),
          children: const [
            FBottomNavigationBarItem(icon: Icon(FLucideIcons.house), label: Text('Home')),
            FBottomNavigationBarItem(icon: Icon(FLucideIcons.stickyNote), label: Text('Notes')),
            FBottomNavigationBarItem(icon: Icon(FLucideIcons.settings), label: Text('Settings')),
          ],
        ),
        child: IndexedStack(
          index: _index,
          children: [
            HomePage(onSeeAll: () => setState(() => _index = 1)),
            const NotesListPage(),
            const SettingsPage(),
          ],
        ),
      );
}

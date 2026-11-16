import 'package:flutter/material.dart' show MaterialPageRoute;
import 'package:flutter/widgets.dart';

/// Opens a screen on top of the current one. Pop with Navigator.of(context).pop().
Future<T?> pushPage<T>(BuildContext context, Widget page) => Navigator.of(context).push<T>(MaterialPageRoute<T>(builder: (_) => page));

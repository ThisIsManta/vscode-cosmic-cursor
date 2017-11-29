### 2.0.0
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they snap to `()`, `{}`, `[]`, `''`, `""`, and ` `` `.
- Amended `cosmicCursor.cursorUp` and `cosmicCursor.cursorDown` commands so that they stop before a word-containing line even fewer than 3 steps.

### 1.0.0
- Renamed `cosmicCursor.cursorUpSelect` to `cosmicCursor.smartSelect.expand` command.
- Renamed `cosmicCursor.cursorDownSelect` to `cosmicCursor.smartSelect.shrink` command.
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they snap to the first/end of its current line.
- Removed `shift+backspace` keybinding.

### 0.0.1
- Public release.

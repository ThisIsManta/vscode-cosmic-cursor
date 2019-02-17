### 5.2.0
- Amended `cosmicCursor.deleteRight` command so it spares a white-space after an opening curly/square bracket.
- Amended `cosmicCursor.smartDuplicate` command so it supports more JavaScript/TypeScript syntax.

### 5.1.1
- Fixed `cosmicCursor.smartDuplicate` command so it supports JSON file.

### 5.1.0
- Amended `cosmicCursor.smartDuplicate` command so it supports JSX syntax.
- Amended `cosmicCursor.smartDuplicate` command so it copies empty lines normally.

### 5.0.0
- Added `cosmicCursor.smartDuplicate` command.

### 4.1.0
- Amended `cosmicCursor.deleteRight` command so it does not spare a white-space before the next non-white-space character.

### 4.0.4
- Fixed `cosmicCursor.deleteLeft` command so it deletes a tab stop before the previous empty line.

### 4.0.3
- Amended `cosmicCursor.smartSelect.expand` command so the smallest selection for a string literal is the characters between the quotes.

### 4.0.2
- Fixed `cosmicCursor.deleteLeft` and `cosmicCursor.deleteRight` commands so they work correctly with multi-selections.

### 4.0.1
- Amended `cosmicCursor.deleteLeft` command so it deletes the previous active line if the previous active line is empty or white-space only
- Amended `cosmicCursor.deleteLeft` command so it deletes one tab-stop in the condition if the current line has more tab-stop than the previous active line.

### 4.0.0
- Added `cosmicCursor.deleteLeft` command.
- Amended `cosmicCursor.deleteRight` command so it moves the cursor to the beginning of the next line if the current line is empty or white-space only.
- Removed `cosmicCursor.deleteLeftStart` command in favor of `cosmicCursor.deleteLeft` command.

### 3.0.0
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they skip over white-spaces between words only if it is in selection mode.
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they snap to `'`, `"`, and a back-quote, but not in pairs.
- Amended `cosmicCursor.deleteRight` command so that it deals with empty lines and white-spaces smartly.

### 2.2.0
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they skip over white-spaces between words.
- Amended `cosmicCursor.cursorWordLeft` and `cosmicCursor.cursorWordRight` commands so that they support multi-cursors.

### 2.1.1
- Amended the logo.

### 2.1.0
- Added `cosmicCursor.deleteRight` command.

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

### 5.4.0
- Removed the keybinding for `smartDelete` command.
- Amended `smartDuplicate` command so it support copying type annotations.

### 5.3.0
- Added `smartDelete` command.
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they leap over white-spaces.
- Fixed `deleteLeft` and `deleteRight` commands so they work correctly with multi-selections.

### 5.2.1
- Fixed `deleteLeft` command so it deletes a white-space after a non-white-space-starting line.
- Fixed `smartDuplicate` command so it duplicates a string element in an array for JSON file.

### 5.2.0
- Amended `deleteRight` command so it spares a white-space after an opening curly/square bracket.
- Amended `smartDuplicate` command so it supports more JavaScript/TypeScript syntax.

### 5.1.1
- Fixed `smartDuplicate` command so it supports JSON file.

### 5.1.0
- Amended `smartDuplicate` command so it supports JSX syntax.
- Amended `smartDuplicate` command so it copies empty lines normally.

### 5.0.0
- Added `smartDuplicate` command.

### 4.1.0
- Amended `deleteRight` command so it does not spare a white-space before the next non-white-space character.

### 4.0.4
- Fixed `deleteLeft` command so it deletes a tab stop before the previous empty line.

### 4.0.3
- Amended `smartSelect.expand` command so the smallest selection for a string literal is the characters between the quotes.

### 4.0.2
- Fixed `deleteLeft` and `deleteRight` commands so they work correctly with multi-selections.

### 4.0.1
- Amended `deleteLeft` command so it deletes the previous active line if the previous active line is empty or white-space only
- Amended `deleteLeft` command so it deletes one tab-stop in the condition if the current line has more tab-stop than the previous active line.

### 4.0.0
- Added `deleteLeft` command.
- Amended `deleteRight` command so it moves the cursor to the beginning of the next line if the current line is empty or white-space only.
- Removed `deleteLeftStart` command in favor of `deleteLeft` command.

### 3.0.0
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they skip over white-spaces between words only if it is in selection mode.
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they snap to `'`, `"`, and a back-quote, but not in pairs.
- Amended `deleteRight` command so that it deals with empty lines and white-spaces smartly.

### 2.2.0
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they skip over white-spaces between words.
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they support multi-cursors.

### 2.1.1
- Amended the logo.

### 2.1.0
- Added `deleteRight` command.

### 2.0.0
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they snap to `()`, `{}`, `[]`, `''`, `""`, and ` `` `.
- Amended `cursorUp` and `cursorDown` commands so that they stop before a word-containing line even fewer than 3 steps.

### 1.0.0
- Renamed `cursorUpSelect` to `smartSelect.expand` command.
- Renamed `cursorDownSelect` to `smartSelect.shrink` command.
- Amended `cursorWordLeft` and `cursorWordRight` commands so that they snap to the first/end of its current line.
- Removed `shift+backspace` keybinding.

### 0.0.1
- Public release.

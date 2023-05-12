**Cosmic Cursor** is a Visual Studio Code extension that overrides some cursor-moving keyboard shortcuts.

|Keybinding|Description|
|---|---|
|**Ctrl+Up**<br>**Ctrl+Down**|Move cursor up/down by 3 character-containing lines. This skips empty lines and lines that contain only [non-word characters](https://www.w3schools.com/Jsref/jsref_regexp_wordchar_non.asp).<br><br>![ctrl+up](docs/ctrl+up.gif)|
|**Ctrl+Shift+Up**|Select like the built-in `editor.action.smartSelect.grow` command, but better with JavaScript/TypeScript/JSON/React files.|
|**Ctrl+Shift+Down**|Reduce the selection made by **Ctrl+Shift+Up**<br><br>![ctrl+shift+up](docs/ctrl+shift+up.gif)|
|**Ctrl+Left**<br>**Ctrl+Right**|Move cursor left/right by one word. This is different from the built-in `cursorWordStartLeft` and `cursorWordEndRight` commands because this considers _camelCase_ as two words and skips non-word characters.<br><br>![ctrl+right](docs/ctrl+right.gif)|
|**Ctrl+Shift+Left**<br>**Ctrl+Shift+Right**|Similar to **Ctrl+Left**/**Ctrl+Right**, but expand the selection instead of moving the cursor.
|**Backspace**|Delete the character on the left of the cursor. If the cursor is in front of the first non-white-space character of the line, this will also delete the white-space characters till the beginning of the line.|
|**Shift+Backspace**|Delete words according to JavaScript/TypeScript syntax.|
|**Delete**|Delete the character on the right of the cursor. If the cursor is at the end of the line, this will also delete the white-space characters at the beginning of the next line; leaving only zero or one white-space as a bumper.|
|**Shift+Delete**|Delete the select line(s).|
|**Ctrl+D**|Duplicate the select syntax node or the current active line. The syntax node supports statements, object members, array members, call arguments, if/else-if/else clauses, switch-case clauses, and arithmetic/bitwise/logical binary operands in JavaScript/TypeScript/JSON for now.|

import * as vscode from 'vscode'

export const deleteLeftStart = () => {
	const editor = vscode.window.activeTextEditor
	editor.edit(edit => {
		edit.delete(new vscode.Range(
			editor.selection.active.with({ character: 0 }),
			editor.selection.active,
		))
	})
}

export const deleteRight = () => {
	const editor = vscode.window.activeTextEditor
	if (
		editor.selection.active.isEqual(editor.selection.anchor) && // No selection has been made
		editor.selection.active.line < editor.document.lineCount - 1 && // Cursor is not at the last line
		editor.selection.active.isEqual(editor.document.lineAt(editor.selection.active.line).range.end) // Cursor is at the end of the line
	) {
		const nextLine = editor.document.lineAt(editor.selection.active.line + 1)
		if (nextLine.firstNonWhitespaceCharacterIndex > 0) {
			return editor.edit(edit => {
				edit.delete(new vscode.Range(
					editor.selection.active,
					new vscode.Position(nextLine.lineNumber, nextLine.firstNonWhitespaceCharacterIndex - 1),
				))
			})
		}
	}

	vscode.commands.executeCommand('deleteRight')
}
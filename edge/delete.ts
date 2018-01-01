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

	// Delete normally for multi-cursors
	if (editor.selections.length > 1) {
		return vscode.commands.executeCommand('deleteRight')
	}

	const cursor = editor.selection

	// Do nothing if the cursor is at the end of the document
	if (
		cursor.active.line === editor.document.lineCount - 1 && // Cursor is at the last line
		cursor.active.isEqual(editor.document.lineAt(cursor.active.line).range.end) // Cursor is at the end of the line
	) {
		return null
	}

	// Delete normally if there is a selection
	if (cursor.active.isEqual(cursor.anchor) === false) {
		return vscode.commands.executeCommand('deleteRight')
	}

	// Delete the current whole line
	const thisLine = editor.document.lineAt(cursor.active.line)
	if (thisLine.isEmptyOrWhitespace) {
		return vscode.commands.executeCommand('editor.action.deleteLines')
	}

	// Delete the white-spaces between the cursor and the first character of the current line
	if (cursor.active.character < thisLine.firstNonWhitespaceCharacterIndex) {
		return editor.edit(edit => {
			edit.delete(new vscode.Range(
				cursor.active,
				cursor.active.with({ character: thisLine.firstNonWhitespaceCharacterIndex }),
			))
		})
	}

	// Snap the next line to the cursor
	const nextLine = editor.document.lineAt(cursor.active.line + 1)
	if (editor.document.getText(new vscode.Range(cursor.active, thisLine.range.end)).trim().length === 0 && nextLine.firstNonWhitespaceCharacterIndex > 0) {
		return editor.edit(edit => {
			const currentPositionAlreadyHasSpaceBumper = cursor.active.character === 0 || editor.document.getText(new vscode.Range(cursor.active.translate({ characterDelta: -1 }), cursor.active)) === ' '
			edit.replace(new vscode.Range(
				cursor.active,
				new vscode.Position(nextLine.lineNumber, nextLine.firstNonWhitespaceCharacterIndex),
			), currentPositionAlreadyHasSpaceBumper ? '' : ' ')
		})
	}

	return vscode.commands.executeCommand('deleteRight')
}
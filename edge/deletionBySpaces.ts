import isNumber from 'lodash/isNumber'
import sortBy from 'lodash/sortBy'
import * as vscode from 'vscode'

export async function deleteLeft() {
	const editor = vscode.window.activeTextEditor
	return editor.edit(edit => {
		for (const cursor of getSortedSelections(editor)) {
			// Delete the selection normally
			if (cursor.active.isEqual(cursor.anchor) === false) {
				edit.delete(cursor)
				continue
			}

			// Do nothing if the cursor is at the beginning of the document
			if (
				cursor.active.line === 0 && // Cursor is at the first line
				cursor.active.character === 0 // Cursor is at the start of the line
			) {
				continue
			}

			const thisLine = editor.document.lineAt(cursor.active.line)
			if (cursor.active.line > 0) {
				const thisSpan = editor.document.getText(new vscode.Range(thisLine.range.start, cursor.active))
				if (thisSpan.length > 0 && /^(\s|\t)+$/.test(thisSpan)) {
					// Delete one tab-stop
					let prevLine = editor.document.lineAt(cursor.active.line - 1)
					while (prevLine.isEmptyOrWhitespace && prevLine.lineNumber > 0) {
						prevLine = editor.document.lineAt(prevLine.lineNumber - 1)
					}
					const prevSpan = prevLine.text.match(/^(\s|\t)*/)[0]
					const tabLong = editor.options.insertSpaces && isNumber(editor.options.tabSize) ? editor.options.tabSize : 1
					if (thisSpan.length > prevSpan.length && cursor.active.character > tabLong) {
						edit.delete(new vscode.Range(
							cursor.active.translate({ characterDelta: -tabLong }),
							cursor.active,
						))
						continue
					}

					// Delete the previous active line
					prevLine = editor.document.lineAt(cursor.active.line - 1)
					if (prevLine.isEmptyOrWhitespace) {
						edit.delete(new vscode.Range(
							prevLine.range.start,
							thisLine.range.start,
						))
						continue
					}
				}
			}

			// Delete the white-spaces between the cursor and the first character of the current line
			if (cursor.active.character > 0 && cursor.active.character === thisLine.firstNonWhitespaceCharacterIndex) {
				edit.delete(new vscode.Range(
					new vscode.Position(cursor.active.line, 0),
					cursor.active,
				))
				continue
			}

			// Delete one character normally
			let prevChar: vscode.Position
			if (cursor.active.character === 0) {
				const prevLine = editor.document.lineAt(cursor.active.line - 1)
				prevChar = prevLine.range.end
			} else {
				prevChar = cursor.active.translate({ characterDelta: -1 })
			}
			edit.delete(new vscode.Range(
				prevChar,
				cursor.active,
			))
		}
	})
}

export async function deleteRight() {
	const editor = vscode.window.activeTextEditor
	return editor.edit(edit => {
		for (const cursor of getSortedSelections(editor)) {
			// Delete normally if there is a selection
			if (cursor.active.isEqual(cursor.anchor) === false) {
				edit.delete(cursor)
				continue
			}

			// Do nothing if the cursor is at the end of the document
			if (
				cursor.active.line === editor.document.lineCount - 1 && // Cursor is at the last line
				cursor.active.isEqual(editor.document.lineAt(cursor.active.line).range.end) // Cursor is at the end of the line
			) {
				continue
			}

			// Delete the white-spaces between the cursor and the first non-white-space character of the current line
			const thisLine = editor.document.lineAt(cursor.active.line)
			if (cursor.active.character < thisLine.firstNonWhitespaceCharacterIndex) {
				edit.delete(new vscode.Range(
					cursor.active,
					cursor.active.with({ character: thisLine.firstNonWhitespaceCharacterIndex }),
				))
				continue
			}

			if (thisLine.lineNumber + 1 <= editor.document.lineCount - 1) {
				const nextLine = editor.document.lineAt(cursor.active.line + 1)

				// Delete the current whole line
				if (thisLine.isEmptyOrWhitespace) {
					edit.delete(new vscode.Range(
						thisLine.range.start,
						thisLine.rangeIncludingLineBreak.end,
					))
					continue
				}

				// Delete the white-spaces between the cursor and the first non-white-space character of the next line
				const betweenTheLines = editor.document.getText(new vscode.Range(cursor.active, thisLine.range.end))
				if (betweenTheLines.trim().length === 0 && nextLine.firstNonWhitespaceCharacterIndex > 0) {
					const prevChar = cursor.active.character === 0 ? '' : editor.document.getText(new vscode.Range(cursor.active.translate({ characterDelta: -1 }), cursor.active))
					const nextChar = nextLine.text.charAt(nextLine.firstNonWhitespaceCharacterIndex)
					edit.replace(new vscode.Range(
						cursor.active,
						new vscode.Position(nextLine.lineNumber, nextLine.firstNonWhitespaceCharacterIndex),
					), /(\w|\(|\{|\[)/.test(prevChar) && /\w/.test(nextChar) || prevChar === '=' ? ' ' : '')
					continue
				}
			}

			// Delete one character normally
			let nextChar = cursor.active.translate({ characterDelta: +1 })
			if (nextChar.isAfter(thisLine.range.end)) {
				nextChar = cursor.active.translate({ lineDelta: +1 }).with({ character: 0 })
			}
			edit.delete(new vscode.Range(
				cursor.active,
				nextChar,
			))
		}
	})
}

function getSortedSelections(editor: vscode.TextEditor) {
	return sortBy(editor.selections, cursor => Math.min(editor.document.offsetAt(cursor.active), editor.document.offsetAt(cursor.anchor)))
		.reverse()
}

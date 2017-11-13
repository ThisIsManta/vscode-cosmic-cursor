import * as _ from 'lodash'
import * as vscode from 'vscode'

const setCursorOrSelection = (lineRank: number, charRank: number, select: boolean) => {
	const cursor = new vscode.Position(lineRank, charRank)
	vscode.window.activeTextEditor.selection = new vscode.Selection(
		select ? vscode.window.activeTextEditor.selection.anchor : cursor,
		cursor
	)
}

export const moveOrSelectCursorByWordLeft = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active.with({ character: 0 }),
		editor.selection.active,
	))

	const wordText = _.last(_.words(lineText))
	if (wordText) {
		const wordRank = lineText.lastIndexOf(wordText)
		if (wordRank + wordText.length === editor.selection.active.character) {
			return setCursorOrSelection(lineRank, wordRank, select)

		} else {
			return setCursorOrSelection(lineRank, wordRank + wordText.length, select)
		}
	}

	while (true) {
		const wordList = _.words(lineText)
		if (wordList.length === 0) {
			if (lineRank === 0) {
				break

			} else {
				lineRank -= 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		const wordText = _.last(wordList)
		const wordRank = lineText.lastIndexOf(wordText) + wordText.length
		return setCursorOrSelection(lineRank, wordRank, select)
	}
}

export const moveOrSelectCursorByWordRight = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active,
		editor.document.lineAt(editor.selection.active.line).range.end,
	))

	const wordText = _.first(_.words(lineText))
	if (wordText) {
		const wordRank = editor.selection.active.character + lineText.indexOf(wordText)
		if (wordRank === editor.selection.active.character) {
			return setCursorOrSelection(lineRank, wordRank + wordText.length, select)

		} else {
			return setCursorOrSelection(lineRank, wordRank, select)
		}
	}

	while (true) {
		const wordList = _.words(lineText)
		if (wordList.length === 0) {
			if (lineRank === editor.document.lineCount - 1) {
				break

			} else {
				lineRank += 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		const wordText = _.first(wordList)
		const wordRank = lineText.indexOf(wordText)
		return setCursorOrSelection(lineRank, wordRank, select)
	}
}

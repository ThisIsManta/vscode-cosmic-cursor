import * as _ from 'lodash'
import * as vscode from 'vscode'

export const moveCursor = (direction: number) => () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line

	const charTest = /\w/

	let lineLeap = 0
	let stepLong = 3
	while (true) {
		if (direction < 0 && lineRank === 0 || direction > 0 && lineRank === editor.document.lineCount - 1) {
			break
		}

		lineRank += direction
		const lineText = editor.document.lineAt(lineRank).text
		lineLeap += 1

		if (charTest.test(lineText)) {
			stepLong -= 1
			if (stepLong === 0) {
				break
			}
		}
	}

	if (lineLeap > 0) {
		return vscode.commands.executeCommand('cursorMove', {
			to: direction < 0 ? 'up' : 'down',
			value: lineLeap,
			by: 'line',
			select: false,
		})
	}
}

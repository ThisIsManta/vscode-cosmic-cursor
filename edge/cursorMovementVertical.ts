import * as vscode from 'vscode'

export function moveCursorUpOrDown(direction: number) {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line

	const charTest = /\w/

	let lineLeap = 0
	let lineStep = 3
	let lastRank = lineRank
	while (true) {
		if (direction < 0 && lineRank === 0 || direction > 0 && lineRank === editor.document.lineCount - 1) {
			break
		}

		lineRank += direction
		const lineText = editor.document.lineAt(lineRank).text
		lineLeap += 1

		if (charTest.test(lineText)) {
			lastRank = lineRank
			lineStep -= 1
			if (lineStep === 0) {
				break
			}

		} else if (lineText.trim().length === 0 && editor.selection.active.line !== lastRank) {
			lineLeap = Math.abs(editor.selection.active.line - lastRank)
			break
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

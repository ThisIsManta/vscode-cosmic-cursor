import * as _ from 'lodash'
import * as vscode from 'vscode'

export const moveOrSelectCursorByWordLeft = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active.with({ character: 0 }),
		editor.selection.active,
	))

	const wordList = _.words(lineText)
	if (wordList.length === 1) {
		const wordRank = lineText.lastIndexOf(_.last(wordList))
		const wordSpan = { start: wordRank, end: wordRank + _.last(wordList).length }
		return vscode.commands.executeCommand('cursorMove', {
			to: 'left',
			value: editor.selection.active.character - (wordSpan.end < editor.selection.active.character ? wordSpan.end : wordSpan.start),
			by: 'character',
			select,
		})

	} else if (wordList.length > 1) {
		const rankList = wordList.slice(-2).map((word, numb, list) => {
			let rank: number
			if (numb === 0) {
				const lastWord = list[numb + 1]
				const lastRank = lineText.lastIndexOf(lastWord)
				rank = lineText.lastIndexOf(word, lastRank)
			} else {
				rank = lineText.lastIndexOf(word)
			}

			return { start: rank, end: rank + word.length }
		})

		if (rankList[1].end < editor.selection.active.character) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'left',
				value: editor.selection.active.character - rankList[1].end,
				by: 'character',
				select,
			})

		} else {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'left',
				value: editor.selection.active.character - Math.max(rankList[0].end, rankList[1].start),
				by: 'character',
				select,
			})
		}
	}

	while (true) {
		const wordList = _.words(lineText)
		if (wordList.length === 0) {
			if (lineRank === 0) {
				return null

			} else {
				lineRank -= 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		await vscode.commands.executeCommand('cursorMove', {
			to: 'up',
			value: editor.selection.active.line - lineRank,
			by: 'line',
			select,
		})

		const wordRank = lineText.lastIndexOf(_.last(wordList))
		if (editor.selection.active.character < wordRank) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'right',
				value: wordRank - editor.selection.active.character,
				by: 'character',
				select,
			})
		} else if (editor.selection.active.character > wordRank) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'left',
				value: editor.selection.active.character - wordRank,
				by: 'character',
				select,
			})
		}
	}
}

export const moveOrSelectCursorByWordRight = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active,
		editor.document.lineAt(editor.selection.active.line).range.end,
	))

	const wordList = _.words(lineText)
	if (wordList.length === 1) {
		const wordRank = lineText.indexOf(wordList[0])
		return vscode.commands.executeCommand('cursorMove', {
			to: 'right',
			value: wordRank + (wordRank > 0 ? 0 : wordList[0].length),
			by: 'character',
			select,
		})

	} else if (wordList.length > 1) {
		const rankList = wordList.slice(0, 2).map((word, numb, list) => {
			let rank: number
			if (numb === 1) {
				const lastWord = list[numb - 1]
				const lastRank = lineText.indexOf(lastWord) + lastWord.length
				rank = lineText.indexOf(word, lastRank)
			} else {
				rank = lineText.indexOf(word)
			}

			return { start: rank, end: rank + word.length }
		})

		if (rankList[0].start > 0) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'right',
				value: rankList[0].start,
				by: 'character',
				select,
			})

		} else {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'right',
				value: Math.min(rankList[0].end, rankList[1].start),
				by: 'character',
				select,
			})
		}
	}

	while (true) {
		const wordList = _.words(lineText)
		if (wordList.length === 0) {
			if (lineRank === editor.document.lineCount - 1) {
				return null

			} else {
				lineRank += 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		await vscode.commands.executeCommand('cursorMove', {
			to: 'down',
			value: lineRank - editor.selection.active.line,
			by: 'line',
			select,
		})

		const wordRank = lineText.indexOf(wordList[0])
		if (editor.selection.active.character < wordRank) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'right',
				value: wordRank - editor.selection.active.character,
				by: 'character',
				select,
			})
		} else if (editor.selection.active.character > wordRank) {
			return vscode.commands.executeCommand('cursorMove', {
				to: 'left',
				value: editor.selection.active.character - wordRank,
				by: 'character',
				select,
			})
		}
	}
}

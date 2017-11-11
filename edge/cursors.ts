import * as _ from 'lodash'
import * as vscode from 'vscode'
import { activate } from './extension';
import { log } from 'util';

export const cursorJump = (direction: number) => () => {
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

interface Sign {
	char: string
	rank: number
	indx: number
}

const findPair = (charList: Array<Sign>, openChar: string, closChar: string) => {
	let wait = 0
	for (const sign of charList) {
		if (openChar !== closChar && sign.char === openChar) {
			wait += 1
			continue
		}

		if (sign.char === closChar) {
			if (wait === 0) {
				return sign
			}
			wait -= 1
		}
	}
	return null
}


export const cursorPairUp = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	if (cursorPairHistory.length === 0) {
		cursorPairHistory.push(editor.selection)
	}

	if (editor.selection.active.line === editor.selection.anchor.line) {
		const lineRank = editor.selection.active.line
		const lineText = editor.document.lineAt(lineRank).text

		if (editor.selection.active.character === editor.selection.anchor.character) {
			const wordWise = [
				lineText.substring(0, editor.selection.active.character).match(/\w+$/),
				lineText.substring(editor.selection.active.character).match(/^\w+/),
			].map(text => _.get(text, '0', ''))

			if (wordWise[0] || wordWise[1]) {
				editor.selection = new vscode.Selection(
					new vscode.Position(lineRank, editor.selection.active.character + wordWise[1].length),
					new vscode.Position(lineRank, editor.selection.active.character - wordWise[0].length),
				)
				cursorPairHistory.push(editor.selection)
				return null
			}
		}

		const operTest = '~!@#$%^&*-=/|\\'.split('').map(_.escapeRegExp).join('|')
		const operWise = [
			lineText.substring(0, editor.selection.start.character).match(new RegExp('(' + operTest + ')$')),
			lineText.substring(editor.selection.end.character).match(new RegExp('^(' + operTest + ')')),
		].map(text => _.get(text, '0', ''))

		if (operWise[0] || operWise[1]) {
			editor.selection = new vscode.Selection(
				new vscode.Position(lineRank, editor.selection.end.character + operWise[1].length),
				new vscode.Position(lineRank, editor.selection.start.character - operWise[0].length),
			)
			cursorPairHistory.push(editor.selection)
			return null
		}
	}

	const textWise = [
		editor.document.getText(new vscode.Range(
			new vscode.Position(0, 0),
			editor.selection.start,
		)),
		editor.document.getText(new vscode.Range(
			editor.selection.end,
			editor.document.lineAt(editor.document.lineCount - 1).range.end,
		)),
	]

	const signList = ['()', '[]', '{}', '<>', '``', '""', '\'\'']
	const signTest = new RegExp('(' + _.chain(signList.map(sign => sign.split(''))).flatten().uniq().map(_.escapeRegExp).value().join('|') + ')')
	const backList = _.chain(textWise[0])
		.split('')
		.map((char, rank, list) => signTest.test(char) ? { char, rank } : null)
		.filter(item => item !== null)
		.reverse()
		.map((item, indx) => ({ ...item, indx }))
		.value()
	const foreList = _.chain(textWise[1])
		.split('')
		.map((char, rank) => signTest.test(char) ? { char, rank } : null)
		.filter(item => item !== null)
		.map((item, indx) => ({ ...item, indx }))
		.value()

	const sortPair = _.chain(signList)
		.map(sign => [
			findPair(backList, sign[1], sign[0]),
			findPair(foreList, sign[0], sign[1]),
		])
		.filter(pair => pair[0] && pair[1])
		.sortBy<Array<Sign>>([
			pair => Math.min(pair[0].indx, pair[1].indx),
			pair => signList.findIndex(sign => sign[0] === pair[0]),
		])
		.value()

	const selxPair = _.first(sortPair)
	if (selxPair) {
		const backLong = textWise[0].length + editor.document.getText(editor.selection).length
		let newSelection = new vscode.Selection(
			editor.document.positionAt(backLong + selxPair[1].rank),
			editor.document.positionAt(selxPair[0].rank + 1),
		)

		if (editor.selection.isEqual(newSelection)) {
			newSelection = new vscode.Selection(
				newSelection.anchor.translate({ characterDelta: +1 }),
				newSelection.active.translate({ characterDelta: -1 }),
			)
		}

		editor.selection = newSelection
		cursorPairHistory.push(editor.selection)
	}
}

export const cursorPairDown = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	while (cursorPairHistory.length > 0) {
		const oldSelection = cursorPairHistory.pop()
		if (oldSelection.isEqual(editor.selection) === false) {
			editor.selection = oldSelection
			break
		}
	}
}

export const cursorWordLeft = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active.with({ character: 0 }),
		editor.selection.active,
	))

	const wordList = _.words(lineText)
	if (wordList.length === 1) {
		const wordRank = lineText.lastIndexOf(_.last(wordList))
		const rank = { start: wordRank, end: wordRank + _.last(wordList).length }
		return vscode.commands.executeCommand('cursorMove', {
			to: 'left',
			value: editor.selection.active.character - (rank.end < editor.selection.active.character ? rank.end : rank.start),
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

export const cursorWordRight = (select: boolean) => async () => {
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
			value: wordRank + wordList[0].length,
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

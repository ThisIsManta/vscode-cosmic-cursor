import * as _ from 'lodash'
import * as vscode from 'vscode'

import { selectCursorByBlockForTypeScript } from './selectCursorByBlockForTypeScript'

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

export const selectCursorByBlock = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	if (cursorPairHistory.length === 0) {
		cursorPairHistory.push(editor.selection)
	}

	const newSelection = selectCursorByBlockForTypeScript(editor)
	if (newSelection) {
		editor.selection = newSelection
		cursorPairHistory.push(newSelection)
		return null
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

export const shrinkCursorByBlock = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	while (cursorPairHistory.length > 0) {
		const oldSelection = cursorPairHistory.pop()
		if (oldSelection.isEqual(editor.selection) === false) {
			editor.selection = oldSelection
			break
		}
	}
}

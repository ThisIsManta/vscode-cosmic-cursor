import * as fp from 'path'
import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { fail } from 'assert';

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

export const expandBlockSelection = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	if (cursorPairHistory.length === 0) {
		cursorPairHistory.push(editor.selection)
	}

	const newSelection = expandBlockSelectionForTypeScript(editor)
	if (newSelection) {
		editor.selection = newSelection
		cursorPairHistory.push(newSelection)
		return null
	}

	return vscode.commands.executeCommand('editor.action.smartSelect.grow')
}

export const shrinkBlockSelection = (cursorPairHistory: Array<vscode.Selection>) => () => {
	const editor = vscode.window.activeTextEditor

	while (cursorPairHistory.length > 0) {
		const oldSelection = cursorPairHistory.pop()
		if (oldSelection.isEqual(editor.selection) === false) {
			editor.selection = oldSelection
			break
		}
	}
}

export const expandBlockSelectionForTypeScript = (editor: vscode.TextEditor) => {
	let rootNode: ts.Node
	if (/(java|type)script(react)?/i.test(editor.document.languageId)) {
		rootNode = ts.createSourceFile(fp.basename(editor.document.fileName), editor.document.getText(), ts.ScriptTarget.ES2015)

	} else if (editor.document.languageId === 'json') {
		rootNode = ts.parseJsonText(fp.basename(editor.document.fileName), editor.document.getText()).jsonObject
	}

	if (!rootNode) {
		return null
	}

	// Travel through the given root node and return an array of range that fall into the given selection
	// Note that the array is sorted in which the bigger range always come first.
	const matchingRangeList = travel(rootNode, editor.document, editor.selection)

	// Add the root node range to the results
	// Note that this is a special case for JSON file as the node returned from "parseJsonText" function has an invalid "pos" and/or "end" property
	if (editor.document.languageId === 'json') {
		matchingRangeList.unshift(new vscode.Range(
			editor.document.positionAt(rootNode.pos),
			editor.document.positionAt(rootNode.end),
		))
	}

	// Trim the beginning white-spaces and new-lines for some ranges
	const trimmedMatchingRangeList = matchingRangeList.map(range => {
		const fullText = editor.document.getText(range)
		const trimText = _.trimStart(fullText)
		if (fullText.length !== trimText.length) {
			return new vscode.Range(
				editor.document.positionAt(editor.document.offsetAt(range.start) + fullText.length - trimText.length),
				range.end,
			)
		}

		return range
	})

	// Select the smallest range that is bigger than the current selection
	const selectedRange = _.findLast(trimmedMatchingRangeList, range => editor.selection.isEqual(range) === false)
	if (selectedRange) {
		return new vscode.Selection(
			selectedRange.end,
			selectedRange.start,
		)
	}

	return null
}

const travel = (givenNode: ts.Node, document: vscode.TextDocument, selection: vscode.Selection, matchingRangeList: Array<vscode.Range> = []) => {
	givenNode.forEachChild(childNode => {
		let range = new vscode.Range(
			document.positionAt(childNode.pos),
			document.positionAt(childNode.end),
		)
		if (range.contains(selection)) {
			matchingRangeList.push(range)
			travel(childNode, document, selection, matchingRangeList)
		}
	})

	return matchingRangeList
}
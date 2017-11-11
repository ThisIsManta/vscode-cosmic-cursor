import * as fp from 'path'
import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { fail } from 'assert';

export const selectCursorByBlockForTypeScript = (editor: vscode.TextEditor) => {
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

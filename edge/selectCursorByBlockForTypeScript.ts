import * as fp from 'path'
import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { fail } from 'assert';

export const selectCursorByBlockForTypeScript = (editor: vscode.TextEditor) => {
	const rootNode = ts.createSourceFile(fp.basename(editor.document.fileName), editor.document.getText(), ts.ScriptTarget.ES2015)

	const tracedRangeList = travel(rootNode, editor.document, editor.selection)
	const trimmedRangeList = tracedRangeList.map(range => {
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
	const selectedRange = _.findLast(trimmedRangeList, range => editor.selection.isEqual(range) === false)
	if (selectedRange) {
		return new vscode.Selection(
			selectedRange.end,
			selectedRange.start,
		)
	}

	return null
}

const travel = (givenNode: ts.Node, document: vscode.TextDocument, selection: vscode.Selection, intermediateResults: Array<vscode.Range> = []) => {
	givenNode.forEachChild(childNode => {
		let range = new vscode.Range(
			document.positionAt(childNode.pos),
			document.positionAt(childNode.end),
		)
		if (range.contains(selection)) {
			intermediateResults.push(range)
			travel(childNode, document, selection, intermediateResults)
		}
	})

	return intermediateResults
}
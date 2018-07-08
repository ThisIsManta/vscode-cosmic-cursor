import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { expandBlockSelectionForTypeScript, NodeRange } from './smartSelect'

export const duplicate = async () => {
	const editor = vscode.window.activeTextEditor

	const sortedNodeRangeList = expandBlockSelectionForTypeScript(editor)

	for (let index = sortedNodeRangeList.length - 1; index >= 0; index--) {
		const parentNodeRange = sortedNodeRangeList[index]

		const action = createActionByNodeType(parentNodeRange, editor)
		if (action) {
			return editor.edit(action)
		}
	}

	// Copy normally as the document is not recognized
	return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
}

const createActionByNodeType = (parentNodeRange: NodeRange, editor: vscode.TextEditor) => {
	const childNodeRangeList: Array<NodeRange> = []
	let createAction: (targetNodeRange: NodeRange) => (edit: vscode.TextEditorEdit) => void =
		targetNodeRange => edit => {
			const lineFeedOrSpace = getLineFeedOrDefault(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.end, ',' + lineFeedOrSpace + editor.document.getText(targetNodeRange.range))
		}

	if (ts.isPropertyAssignment(parentNodeRange.node)) {
		parentNodeRange.node.initializer.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})

	} else if (
		ts.isObjectLiteralExpression(parentNodeRange.node) ||
		ts.isArrayLiteralExpression(parentNodeRange.node)
	) {
		parentNodeRange.node.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})

	} else if (ts.isCallExpression(parentNodeRange.node)) {
		parentNodeRange.node.arguments.forEach(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})

	} else if (
		ts.isBlock(parentNodeRange.node) ||
		ts.isSourceFile(parentNodeRange.node) ||
		ts.isModuleBlock(parentNodeRange.node) ||
		ts.isCaseBlock(parentNodeRange.node)
	) {
		parentNodeRange.node.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const lineFeedOfSpace = getLineFeedOrDefault(targetNodeRange, ' ')
			// TODO: add ; when in the same line
			edit.insert(targetNodeRange.range.end, lineFeedOfSpace + editor.document.getText(targetNodeRange.range))
		}

		// TODO: (... && || ...)
		// TODO: if (...) => else if (...)
		// TODO: switch case
		// TODO: if a comment, copy normally
	}

	if (childNodeRangeList.length === 0) {
		return null
	}

	if (editor.selection.active.isEqual(editor.selection.anchor)) { // In case of a non-selection
		const cursorMatchingNodeRange = childNodeRangeList.find(item => item.range.contains(editor.selection))
		if (cursorMatchingNodeRange) {
			return createAction(cursorMatchingNodeRange)
		}

		if (parentNodeRange.range.isSingleLine) {
			return null
		}

		const currentLine = editor.document.lineAt(editor.selection.active.line)
		const lineMatchingNodeRangeList = childNodeRangeList.filter(item => currentLine.lineNumber >= item.range.start.line && currentLine.lineNumber <= item.range.end.line)
		if (lineMatchingNodeRangeList.length > 0) {
			if (currentLine.text.substring(0, editor.selection.active.character).trim().length === 0) {
				return createAction(_.first(lineMatchingNodeRangeList))

			} else if (currentLine.text.substring(editor.selection.active.character).trim().length === 0) {
				return createAction(_.last(lineMatchingNodeRangeList))
			}
		}

	} else { // In case of a selection

	}

	function getLineFeedOrDefault(targetNodeRange: NodeRange, defaultValue: string) {
		let lineFeedNeeded = false
		if (childNodeRangeList.length === 1) {
			lineFeedNeeded = parentNodeRange.range.end.line !== targetNodeRange.range.start.line
		} else if (targetNodeRange === childNodeRangeList[0]) {
			lineFeedNeeded = targetNodeRange.range.end.line !== childNodeRangeList[1].range.start.line
		} else {
			lineFeedNeeded = targetNodeRange.range.end.line !== childNodeRangeList[childNodeRangeList.indexOf(targetNodeRange) - 1].range.start.line
		}
		if (!lineFeedNeeded) {
			return defaultValue
		}

		const newLine = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
		const textBeforeTheGivenNode = editor.document.getText(new vscode.Range(
			new vscode.Position(targetNodeRange.range.start.line, 0),
			new vscode.Position(targetNodeRange.range.start.line, targetNodeRange.range.start.character),
		))
		const indentation = textBeforeTheGivenNode.match(/^([\s\t]*)/)[1]
		return newLine + indentation
	}
}

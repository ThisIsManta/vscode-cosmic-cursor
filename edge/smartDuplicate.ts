import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { expandBlockSelectionForTypeScript, NodeRange } from './smartSelect'

export const duplicate = async () => {
	const editor = vscode.window.activeTextEditor

	const sortedNodeRangeList = expandBlockSelectionForTypeScript(editor)

	let parentNodeRange: NodeRange
	const childNodeRangeList: Array<NodeRange> = []
	_.forEachRight(sortedNodeRangeList, item => {
		if (ts.isPropertyAssignment(item.node)) {
			parentNodeRange = item
			item.node.initializer.forEachChild(childNode => {
				childNodeRangeList.push(new NodeRange(childNode, editor.document))
			})
		}

		// Stop finding when there are some children
		return childNodeRangeList.length > 0 ? false : undefined
	})

	// Copy normally as the document is not recognized
	if (!parentNodeRange) {
		return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
	}

	if (editor.selection.active.isEqual(editor.selection.anchor)) { // In case of a non-selection
		const cursorMatchingNodeRange = childNodeRangeList.find(item => item.range.contains(editor.selection))
		if (cursorMatchingNodeRange) {
			return duplicateInternal(cursorMatchingNodeRange)
		}

		const currentLine = editor.document.lineAt(editor.selection.active.line)
		const lineContainingNodeRangeList = childNodeRangeList.filter(item => currentLine.lineNumber >= item.range.start.line && currentLine.lineNumber <= item.range.end.line)
		const lineContainingNodeRange = editor.selection.active.character === currentLine.range.end.character ? _.last(lineContainingNodeRangeList) : _.first(lineContainingNodeRangeList)
		if (lineContainingNodeRange) {
			return duplicateInternal(lineContainingNodeRange)
		}

	} else { // In case of a selection

	}

	function duplicateInternal(targetNodeRange: NodeRange) {
		const newLineNeeded = checkIfNewLineNeeded(targetNodeRange)

		return editor.edit(edit => {
			if (ts.isPropertyAssignment(parentNodeRange.node)) {
				edit.insert(targetNodeRange.range.end, ',' + (newLineNeeded ? getLineFeed(targetNodeRange) : ' ') + editor.document.getText(targetNodeRange.range))
			}
		})

		// TODO: move cursor so to property name for renaming

		// return vscode.commands.executeCommand('editor.action.formatDocument')
	}

	// TODO: support parentNodeRange
	// TODO: merge this with getLineFeed()
	function checkIfNewLineNeeded(targetNodeRange: NodeRange) {
		if (childNodeRangeList.length === 1) {
			return parentNodeRange.range.end.line !== targetNodeRange.range.start.line
		} else if (targetNodeRange === childNodeRangeList[0]) {
			return targetNodeRange.range.end.line !== childNodeRangeList[1].range.start.line
		} else {
			return targetNodeRange.range.end.line !== childNodeRangeList[childNodeRangeList.indexOf(targetNodeRange) - 1].range.start.line
		}
	}

	function getLineFeed(targetNodeRange: NodeRange) {
		const newLine = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
		const textBeforeTheGivenNode = editor.document.getText(new vscode.Range(
			new vscode.Position(targetNodeRange.range.start.line, 0),
			new vscode.Position(targetNodeRange.range.start.line, targetNodeRange.range.start.character),
		))
		const indentation = textBeforeTheGivenNode.match(/^([\s\t]*)/)[1]
		return newLine + indentation
	}
}

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
			edit.insert(targetNodeRange.range.start, editor.document.getText(targetNodeRange.range) + ',' + lineFeedOrSpace)
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
			edit.insert(targetNodeRange.range.start, editor.document.getText(targetNodeRange.range) + lineFeedOfSpace)
		}

	} else if (ts.isBinaryExpression(parentNodeRange.node) && _.includes([ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken], parentNodeRange.node.operatorToken.kind)) {
		[parentNodeRange.node.left, parentNodeRange.node.right].forEach(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const parentNode = parentNodeRange.node as ts.BinaryExpression
			const operator = parentNode.operatorToken.getFullText()
			const lineFeedOfSpace = getLineFeedOrDefault(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.start, editor.document.getText(targetNodeRange.range) + operator + lineFeedOfSpace)
		}

	} else if (ts.isIfStatement(parentNodeRange.node)) {
		[parentNodeRange.node.expression, parentNodeRange.node.thenStatement, parentNodeRange.node.elseStatement].forEach(childNode => {
			if (!childNode) return null
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const parentNode = parentNodeRange.node as ts.IfStatement
			if (targetNodeRange.node === parentNode.expression || targetNodeRange.node === parentNode.thenStatement) { // In case of condition or if-block
				let thenText = parentNode.getText()
				if (parentNode.elseStatement) {
					const elseText = parentNode.elseStatement.getText()
					thenText = thenText.substring(0, thenText.length - elseText.length)
				} else {
					thenText += ' else '
				}
				edit.insert(parentNodeRange.range.start, thenText)

			} else if (ts.isIfStatement(targetNodeRange.node)) { // In case of else-if-block
				let thenText = targetNodeRange.node.getText()
				if (targetNodeRange.node.elseStatement) {
					const elseText = targetNodeRange.node.elseStatement.getText()
					thenText = thenText.substring(0, thenText.length - elseText.length)
				}
				edit.insert(targetNodeRange.range.start, thenText)

			} else { // In case of else-block
				edit.insert(targetNodeRange.range.start, 'if () ' + targetNodeRange.node.getText() + ' else ')
				const condition = targetNodeRange.range.start.translate({ characterDelta: 'if ('.length })
				setTimeout(() => {
					editor.selections = [new vscode.Selection(condition, condition)]
				}, 0)
			}
		}
	}
	// TODO: switch case
	// TODO: if a comment, copy normally

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

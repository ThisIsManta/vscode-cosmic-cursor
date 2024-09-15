import findLast from 'lodash/findLast'
import trimStart from 'lodash/trimStart'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { parseTypeScript } from './utility'

export function expandSelection(cursorPairHistory: Array<vscode.Selection>) {
	const editor = vscode.window.activeTextEditor

	if (cursorPairHistory.length === 0) {
		cursorPairHistory.push(editor.selection)
	}

	const matchingNodeRangeList = expandSelectionForTypeScript(editor)

	// Select the smallest range that is bigger than the current selection
	const selectedNodeRange = findLast(matchingNodeRangeList, item => editor.selection.isEqual(item.range) === false)

	if (!selectedNodeRange) {
		return vscode.commands.executeCommand('editor.action.smartSelect.grow')
	}

	const newSelection = new vscode.Selection(
		selectedNodeRange.range.end,
		selectedNodeRange.range.start,
	)
	editor.selection = newSelection
	cursorPairHistory.push(newSelection)
}

export function shrinkSelection(cursorPairHistory: Array<vscode.Selection>) {
	const editor = vscode.window.activeTextEditor

	while (cursorPairHistory.length > 0) {
		const oldSelection = cursorPairHistory.pop()
		if (oldSelection.isEqual(editor.selection) === false) {
			editor.selection = oldSelection
			break
		}
	}
}

export function expandSelectionForTypeScript(editor: vscode.TextEditor) {
	const rootNode = parseTypeScript(editor.document)
	if (!rootNode) {
		return []
	}

	// Travel through the given root node and return an array of range that fall into the given selection
	// Note that the array is sorted in which the bigger range always come first.
	const matchingNodeRangeList = travel(rootNode, editor.document, editor.selection)

	// Add the root node range to the results
	// Note that this is a special case for JSON file as the node returned from "parseJsonText" function has an invalid "pos" and/or "end" property
	if (editor.document.languageId === 'json') {
		matchingNodeRangeList.unshift({
			range: new vscode.Range(
				editor.document.positionAt(rootNode.pos),
				editor.document.positionAt(rootNode.end),
			),
			node: rootNode,
		})
	}

	return matchingNodeRangeList
}

export class NodeRange {
	readonly node: ts.Node | null
	readonly range: vscode.Range

	constructor(node: ts.Node | null, document: vscode.TextDocument) {
		this.node = node
		this.range = new vscode.Range(
			document.positionAt(node.pos),
			document.positionAt(node.end),
		)

		// Trim the beginning white-spaces and new-lines for some ranges
		const fullText = document.getText(this.range)
		const trimText = trimStart(fullText)
		if (fullText.length !== trimText.length) {
			this.range = new vscode.Range(
				document.positionAt(document.offsetAt(this.range.start) + fullText.length - trimText.length),
				this.range.end,
			)
		}
	}
}

function travel(givenNode: ts.Node, document: vscode.TextDocument, selection: vscode.Selection, matchingNodeRangeList: Array<NodeRange> = []) {
	givenNode.forEachChild(childNode => {
		const nodeRange = new NodeRange(childNode, document)

		if (nodeRange.range.contains(selection)) {
			matchingNodeRangeList.push(nodeRange)

			if (childNode.kind === ts.SyntaxKind.StringLiteral && ts.isStringLiteral(childNode) && childNode.text.trim().length > 0) {
				let fullText = document.getText(nodeRange.range)
				let modifiedRange = nodeRange.range
				if (/^('|"|`)/.test(fullText)) {
					const trimText = fullText.substring(1)
					modifiedRange = new vscode.Range(
						modifiedRange.start.translate({ characterDelta: +1 }),
						modifiedRange.end,
					)
					fullText = trimText
				}
				if (/('|"|`)$/.test(fullText)) {
					const trimText = fullText.substring(0, fullText.length - 1)
					modifiedRange = new vscode.Range(
						modifiedRange.start,
						modifiedRange.end.translate({ characterDelta: -1 }),
					)
					fullText = trimText
				}
				if (modifiedRange.contains(selection)) {
					matchingNodeRangeList.push({ node: givenNode, range: modifiedRange })
				}
			}

			travel(childNode, document, selection, matchingNodeRangeList)
		}
	})

	return matchingNodeRangeList
}

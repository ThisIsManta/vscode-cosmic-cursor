import * as fp from 'path'
import * as _ from 'lodash'
import * as vscode from 'vscode'
import * as ts from 'typescript'

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

	const matchingNodeRangeList = expandBlockSelectionForTypeScript(editor)

	// Select the smallest range that is bigger than the current selection
	const selectedNodeRange = _.findLast(matchingNodeRangeList, item => editor.selection.isEqual(item.range) === false)

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
		rootNode = ts.createSourceFile(fp.basename(editor.document.fileName), editor.document.getText(), ts.ScriptTarget.ES2015, true)

	} else if (editor.document.languageId === 'json') {
		rootNode = ts.parseJsonText(fp.basename(editor.document.fileName), editor.document.getText())
	}

	if (!rootNode) {
		return null
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
	node: ts.Node
	range: vscode.Range

	constructor(node: ts.Node, document: vscode.TextDocument) {
		this.node = node
		this.range = new vscode.Range(
			document.positionAt(node.pos),
			document.positionAt(node.end),
		)

		// Trim the beginning white-spaces and new-lines for some ranges
		const fullText = document.getText(this.range)
		const trimText = _.trimStart(fullText)
		if (fullText.length !== trimText.length) {
			this.range = new vscode.Range(
				document.positionAt(document.offsetAt(this.range.start) + fullText.length - trimText.length),
				this.range.end,
			)
		}
	}
}

const travel = (givenNode: ts.Node, document: vscode.TextDocument, selection: vscode.Selection, matchingNodeRangeList: Array<NodeRange> = []) => {
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

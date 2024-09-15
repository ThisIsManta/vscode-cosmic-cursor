import compact from 'lodash/compact'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { parseTypeScript } from './utility'

export function deleteLines() {
	const ranges = getStatementRanges()
	if (Array.isArray(ranges) && ranges.length > 0) {
		const editor = vscode.window.activeTextEditor
		return editor.edit(edit => {
			for (const range of ranges) {
				edit.delete(range)
			}
		})
	}

	return vscode.commands.executeCommand('editor.action.deleteLines')
}

function getStatementRanges(): Array<vscode.Range> | undefined {
	const editor = vscode.window.activeTextEditor

	// Does not support multi-cursor deletion
	if (editor.selections.length > 1) {
		return
	}

	const rootNode = parseTypeScript(editor.document)
	if (!rootNode) {
		return
	}

	const selectionText = editor.document.getText(new vscode.Range(
		editor.document.lineAt(editor.selection.start.line).range.start,
		editor.document.lineAt(editor.selection.end.line).range.end
	))
	if (selectionText.trim().length === 0 || selectionText.split(/\r?\n/g).every(line => line.trim().length === 0 || line.startsWith('//'))) {
		return
	}

	const startIndex = editor.document.offsetAt(editor.selection.start)
	const endIndex = editor.document.offsetAt(editor.selection.end)

	const relationships = getInRangeRelationships(rootNode, startIndex, endIndex)
	const matchingNodes = getBreathFirstNodes(relationships) || compact([getDepthFirstNode(relationships)])

	return matchingNodes.map(node => {
		const startIndex = ((): number => {
			const leadingComments = ts.getLeadingCommentRanges(rootNode.getFullText(), node.pos) || []
			for (let index = leadingComments.length; index >= 0; index--) {
				const previousLine = editor.document.positionAt(index === 0 ? node.pos : leadingComments[index - 1].end).line
				const currentLine = editor.document.positionAt(index === leadingComments.length ? node.getStart() : leadingComments[index].pos).line
				const newLineCount = currentLine - previousLine
				if (newLineCount >= 2) {
					return editor.document.offsetAt(editor.document.lineAt(currentLine - 1).range.end)
				}
			}

			const leadingText = node.getFullText().substring(0, node.getStart() - node.getFullStart())
			const aboveLineIsEmpty = /\r?\n[ \t]*\r?\n$/m.test(leadingText)
			if (aboveLineIsEmpty) {
				const firstTokenLine = editor.document.positionAt(node.getStart()).line
				return editor.document.offsetAt(editor.document.lineAt(firstTokenLine - 1).range.end)
			}

			return node.pos
		})()

		return new vscode.Range(
			editor.document.positionAt(startIndex),
			editor.document.positionAt(node.end)
		)
	})
}

type NodeChildrenRelationship = [ts.Node, Array<NodeChildrenRelationship>]
function getInRangeRelationships(node: ts.Node, startIndex: number, endIndex: number): NodeChildrenRelationship | null {
	if (
		ts.isSourceFile(node) ||
		node.pos < startIndex && startIndex <= node.end ||
		node.pos < endIndex && endIndex <= node.end ||
		startIndex < node.pos && node.end <= endIndex
	) {
		const childNodes: Array<NodeChildrenRelationship> = []
		node.forEachChild(childNode => {
			const output = getInRangeRelationships(childNode, startIndex, endIndex)
			if (output) {
				childNodes.push(output)
			}
		})
		return [node, childNodes]
	}

	return null
}

function getBreathFirstNodes([node, relationships]: NodeChildrenRelationship): Array<ts.Node> | null {
	const nodes = relationships.map(([childNode]) => childNode).filter(childNode => ts.isStatement(childNode))
	if (nodes.length >= 2) {
		return nodes
	}

	for (const relationship of relationships) {
		const nodes = getBreathFirstNodes(relationship)
		if (nodes) {
			return nodes
		}
	}

	return null
}

function getDepthFirstNode([node, relationships]: NodeChildrenRelationship): ts.Node | null {
	for (const relationship of relationships) {
		const node = getDepthFirstNode(relationship)
		if (node) {
			return node
		}
	}

	if (ts.isStatement(node)) {
		return node
	}

	return null
}

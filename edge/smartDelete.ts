import sortBy from 'lodash/sortBy'
import first from 'lodash/first'
import last from 'lodash/last'
import isObject from 'lodash/isObject'
import isArrayLike from 'lodash/isArrayLike'
import * as ts from 'typescript'
import * as vscode from 'vscode'
import { parseTypeScript } from './smartSelect'

export const smartDelete = async () => {
	const editor = vscode.window.activeTextEditor

	if (editor.selections.length > 1) {
		return vscode.commands.executeCommand('deleteLeft')
	}

	if (editor.selection.active.isEqual(editor.selection.anchor) === false) {
		return vscode.commands.executeCommand('deleteLeft')
	}

	const rootNode = parseTypeScript(editor.document)
	if (!rootNode) {
		return vscode.commands.executeCommand('deleteLeft')
	}

	let cursor = editor.selection.active
	const line = editor.document.lineAt(editor.selection.active.line)
	if (cursor.character <= line.firstNonWhitespaceCharacterIndex) {
		cursor = new vscode.Position(line.lineNumber, line.firstNonWhitespaceCharacterIndex + 1)
	} else if (cursor.character > line.text.trimRight().length) {
		cursor = new vscode.Position(line.lineNumber, line.text.trimRight().length)
	}

	const ranges = getDeletingRanges(rootNode, editor.document.offsetAt(cursor), createShiftingFunctions(editor.document))
	if (!ranges) {
		return vscode.commands.executeCommand('deleteLeft')
	}

	const safeRanges = sortBy(ranges, pair => pair[0])
		.reduce<Array<[number, number]>>((list, currentPair, index, sortedPairs) => {
			const previousPair = sortedPairs[index - 1]
			if (previousPair && previousPair[1] > currentPair[0]) {
				// Merge overlapped ranges
				list.pop()
				list.push([previousPair[0], currentPair[1]])

			} else {
				list.push(currentPair)
			}
			return list
		}, [])
		.reverse()
		.map(([start, end]) => new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end)))
		.map(range => {
			const lineStart = editor.document.lineAt(range.start.line)
			const lineEnd = editor.document.lineAt(range.end.line)
			if (range.start.character <= lineStart.firstNonWhitespaceCharacterIndex && range.end.character === lineEnd.range.end.character) {
				return new vscode.Range(lineStart.range.start, lineEnd.rangeIncludingLineBreak.end)
			}
			return range
		})

	return editor.edit(edit => {
		for (const range of safeRanges) {
			edit.delete(range)
		}
	})
}

function getScriptKind(document: vscode.TextDocument) {
	if (document.languageId === 'json') {
		return ts.ScriptKind.JSON
	}

	if (/^javascript(react)?$/.test(document.languageId)) {
		return document.languageId.endsWith('react') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	}

	if (/^typescript(react)?$/.test(document.languageId)) {
		return document.languageId.endsWith('react') ? ts.ScriptKind.JSX : ts.ScriptKind.JS
	}

	return null
}

function isNodeArray(node: any): node is ts.NodeArray<ts.Node> {
	return isArrayLike(node) && node.pos !== undefined && node.end !== undefined
}

function createShiftingFunctions(document: vscode.TextDocument) {
	function ΔL(token: ts.Node) {
		return token.pos + token.getFullText().length - token.getText().length
	}

	function XL(token: ts.Node) {
		const index = ΔL(token)
		const { line, character } = document.positionAt(index)
		const spaceCount = document.lineAt(line).text.substring(0, character).match(/ *$/)[0].length
		return index - spaceCount
	}

	function XR(token: ts.Node) {
		const index = token.end
		const { line, character } = document.positionAt(index)
		const spaceAndLineFeedCount = document.lineAt(line).text.substring(character).match(/^\s*/)[0].length
		return index + spaceAndLineFeedCount
	}

	return { ΔL, XL, XR }
}

function getDeletingRanges(node: ts.Node, index: number, shiftingFunctions: ReturnType<typeof createShiftingFunctions>, visitedNodes = new Set<ts.Node>()): Array<[number, number]> {
	if (!node) {
		return
	}

	if (index < node.pos || node.end < index) {
		return
	}

	if (visitedNodes.has(node)) {
		return
	}
	visitedNodes.add(node)

	for (const key of Object.getOwnPropertyNames(node)) {
		if (key === 'parent' || ts.isSourceFile(node) && key !== 'statements') {
			continue
		}

		const childNode: ts.Node | ts.NodeArray<ts.Node> = node[key]
		if (!isObject(childNode)) {
			continue
		}

		if (isNodeArray(childNode)) {
			for (const innerNode of childNode) {
				const ranges = getDeletingRanges(innerNode, index, shiftingFunctions, visitedNodes)
				if (ranges && ranges.some(pair => pair[0] < index && index <= pair[1])) {
					return ranges
				}
			}

		} else {
			const ranges = getDeletingRanges(childNode, index, shiftingFunctions, visitedNodes)
			if (ranges && ranges.some(pair => pair[0] < index && index <= pair[1])) {
				return ranges
			}
		}
	}

	const { ΔL, XL, XR } = shiftingFunctions

	if (node.parent && ts.isCallOrNewExpression(node.parent) && node.parent.arguments.length > 0 && node.parent.arguments.includes(node as any)) {
		if (node.parent.arguments.length === 1) {
			return [
				// Delete "a" in "call(a)"
				[ΔL(node), XR(node)],
			]

		} else if (node.parent.arguments[0] === node) {
			return [
				// Delete "a," in "call(a, b)"
				[ΔL(node), ΔL(node.parent.arguments[1].getFirstToken())],
			]

		} else {
			return [
				// Delete ", b" in "call(a, b)"
				[XR(node.parent.arguments[node.parent.arguments.indexOf(node as any) - 1]), XR(node)],
			]
		}
	}

	if (ts.isParenthesizedExpression(node)) {
		if (node.expression) {
			return [
				// Delete "("
				[ΔL(node), XR(node.getFirstToken())],
				// Delete ")"
				[XL(node.getLastToken()), node.getLastToken().end],
			]
		}

		return [
			// Delete "()"
			[ΔL(node), node.end],
		]
	}

	if (node.parent && ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node) {
		let stub = node
		while (stub.parent) {
			if (ts.isCallExpression(stub.parent) || ts.isPropertyAccessExpression(stub.parent) || ts.isElementAccessExpression(stub.parent)) {
				stub = stub.parent
			} else {
				break
			}
		}
		if (stub) {
			return [
				// Delete "call(...)" in "chain.call(...)"
				[ΔL(stub), XR(stub)]
			]
		}
	}

	if (node.parent && ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) {
		return [
			// Delete "call(...)" in "chain.call(...)"
			[
				node.parent.expression.end,
				node.parent.parent && ts.isCallExpression(node.parent.parent) && node.parent.parent.expression === node.parent
					? node.parent.parent.end
					: node.parent.end
			]
		]
	}

	if (ts.isCallExpression(node)) {
		if (node.arguments.length > 1) {
			return [
				// Delete "call(...)"
				[ΔL(node.getFirstToken()), XR(node.getLastToken())],
			]

		} else {
			return [
				// Delete "call(" as in "call(arguments)"
				[ΔL(node.getFirstToken()), node.arguments.pos],
				// Delete ")" as in "call(arguments)"
				[node.arguments.end, XR(node.getLastToken())],
			]
		}
	}

	if (ts.isExpressionStatement(node)) {
		return [
			// Delete the whole statement
			[ΔL(node.getFirstToken()), XR(node.getLastToken())],
		]
	}

	// TODO: decrease indentations
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		if (node.body && ts.isBlock(node.body) && node.body.statements.length === 1) {
			const onlyNode = node.body.statements[0]
			if (ts.isExpressionStatement(onlyNode)) {
				return [
					// Delete "function (...) {"
					[ΔL(node.getFirstToken()), XR(node.body.getFirstToken())],
					// Delete "}"
					[XL(node.body.getLastToken()), XR(node.body.getLastToken())],
				]

			} else if (ts.isReturnStatement(onlyNode)) {
				return [
					// Delete "function (...) { return"
					[ΔL(node.getFirstToken()), XR(onlyNode.getFirstToken())],
					// Delete "}"
					[XL(node.body.getLastToken()), XR(node.body.getLastToken())],
				]
			}
		}

		return [
			// Delete the whole function
			[XL(node.getFirstToken()), XR(node.body.getLastToken())],
		]
	}

	if (ts.isVariableDeclarationList(node)) {
		return [
			// Delete "const a = ..."
			[ΔL(node.parent.getFirstToken()), XR(node)],
		]
	}

	if (ts.isVariableDeclaration(node) && ts.isVariableDeclarationList(node.parent)) {
		if (node.parent.declarations.length === 1) {
			if (node.initializer) {
				return [
					// Delete "const a ="
					[ΔL(node.parent.getFirstToken()), ΔL(node.initializer)],
				]

			} else {
				return [
					// Delete "const a = ..."
					[ΔL(node.parent.getFirstToken()), XR(node)],
				]
			}

		} else if (node.parent.declarations[0] === node) {
			return [
				// Delete "a = ...," in "const a = ..., b = ..."
				[XL(node.getFirstToken()), XL(node.parent.declarations[1].getFirstToken())],
			]

		} else {
			return [
				// Delete ", b = ..." in "const a = ..., b = ..."
				[node.parent.declarations[node.parent.declarations.indexOf(node) - 1].getLastToken().end, XR(node)],
			]
		}
	}

	if (ts.isReturnStatement(node) || ts.isAwaitExpression(node)) {
		return [
			// Delete "return"
			[ΔL(node.getFirstToken()), XR(node.getFirstToken())],
		]
	}

	if (ts.isIfStatement(node)) {
		const ranges = []

		// TODO: decrease indentations
		if (ts.isBlock(node.thenStatement)) {
			ranges.push(
				// Delete "if (...) {"
				[XL(node.getFirstToken()), node.thenStatement.getFirstToken().end],
				// Delete "}"
				[XL(node.thenStatement.getLastToken()), node.thenStatement.getLastToken().end],
			)

		} else {
			// Delete "if (...)"
			ranges.push(
				[XL(node.getFirstToken()), node.thenStatement.getFirstToken().pos],
			)
		}

		if (node.elseStatement) {
			// Delete " else "
			ranges.push(
				[last(ranges).end, XL(node.elseStatement.getFirstToken())],
			)
		}

		if (node.parent && ts.isIfStatement(node.parent) && node.parent.elseStatement === node) {
			// Delete " else " as in nested if-else
			ranges.push(
				[node.parent.thenStatement.getLastToken().end, first(ranges).pos],
			)
		}

		return ranges
	}

	if ((ts.isJsxOpeningElement(node) || ts.isJsxClosingElement(node)) && node.parent && ts.isJsxElement(node.parent)) {
		return [
			// Delete "<div>" in "<div>...</div>"
			[XL(node.parent.openingElement.getFirstToken()), XR(node.parent.openingElement.getLastToken())],
			// Delete "</div>" in "<div>...</div>"
			[XL(node.parent.closingElement.getFirstToken()), XR(node.parent.closingElement.getLastToken())],
		]
	}

	if (ts.isJsxSelfClosingElement(node)) {
		return [
			// Delete "<div/>"
			[XL(node), XR(node)]
		]
	}

	if (ts.isJsxAttribute(node)) {
		return [
			// Delete "attribute={...}"
			[ΔL(node), XR(node)]
		]
	}

	if (node.parent && ts.isJsxExpression(node.parent) && node.parent.parent && ts.isJsxElement(node.parent.parent) && node.parent.parent.children.includes(node.parent)) {
		return [
			// Delete "{x}" in "<div>{x}</div>"
			[ΔL(node.parent.getFirstToken()), node.parent.getLastToken().end]
		]
	}

	if (node.parent && ts.isBinaryExpression(node.parent)) {
		if (node.parent.left === node) {
			return [
				// Delete "a || " in "a || b"
				[ΔL(node), ΔL(node.parent.right)]
			]

		} else {
			return [
				// Delete " || b" in "a || b"
				[node.parent.left.end, XR(node)]
			]
		}
	}
}

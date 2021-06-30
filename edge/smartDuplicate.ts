import compact from 'lodash/compact'
import trim from 'lodash/trim'
import first from 'lodash/first'
import last from 'lodash/last'
import remove from 'lodash/remove'
import defer from 'lodash/defer'
import * as vscode from 'vscode'
import * as ts from 'typescript'
import { expandBlockSelectionForTypeScript, NodeRange } from './smartSelect'

// TODO: support multi-selections
export const duplicate = async () => {
	const editor = vscode.window.activeTextEditor

	// Neither support multiline selection nor range selection
	if (editor.selections.length > 1 || editor.selection.active.isEqual(editor.selection.anchor) === false) {
		return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
	}

	const currentLine = editor.document.lineAt(editor.selection.active.line)

	// In case of empty lines
	if (currentLine.text.trim().length === 0) {
		return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
	}

	if (/^((java|type)script(react)?|jsonc?)$/.test(editor.document.languageId)) {
		// In case of single-line comments
		if (currentLine.text.trim().startsWith('//')) {
			return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
		}

		const northCursor = editor.selection.active.isBefore(editor.selection.anchor) ? editor.selection.active : editor.selection.anchor
		const northPartText = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), northCursor))
		const northOpenCommentIndex = northPartText.lastIndexOf('/*')
		const northCloseCommentIndex = northPartText.indexOf('*/', northOpenCommentIndex + 2)

		const southCursor = editor.selection.active.isAfter(editor.selection.anchor) ? editor.selection.active : editor.selection.anchor
		const endOfFile = editor.document.lineAt(editor.document.lineCount - 1).range.end
		const southPartText = editor.document.getText(new vscode.Range(southCursor, endOfFile))
		const southCloseCommentIndex = southPartText.indexOf('*/')
		const southOpenCommentIndex = southPartText.lastIndexOf('/*', southCloseCommentIndex)

		// In case of multi-line comments
		if (northOpenCommentIndex >= 0 && northCloseCommentIndex === -1 && southCloseCommentIndex >= 0 && southOpenCommentIndex === -1) {
			return editor.edit(edit => {
				const startOfComment = editor.document.positionAt(northOpenCommentIndex)
				const endOfComment = editor.document.positionAt(editor.document.offsetAt(southCursor) + southCloseCommentIndex + 2)
				const startOfLineText = editor.document.getText(new vscode.Range(startOfComment.with({ character: 0 }), startOfComment))
				const endOfLineText = editor.document.getText(new vscode.Range(endOfComment, editor.document.lineAt(endOfComment.line).range.end))
				let lineFeedOrEmpty = ''
				if (startOfLineText.trim().length === 0 && endOfLineText.trim().length === 0) {
					lineFeedOrEmpty = (editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n') + startOfLineText
				}

				edit.insert(startOfComment, editor.document.getText(new vscode.Range(startOfComment, endOfComment)) + lineFeedOrEmpty)
			})
		}

		// In case of syntactic copies
		const sortedNodeRangeList = expandBlockSelectionForTypeScript(editor).reverse()
		for (const parentNodeRange of sortedNodeRangeList) {
			const action = createActionByNodeType(parentNodeRange, editor)
			if (action) {
				return editor.edit(action)
			}
		}
	}

	// Copy normally
	return vscode.commands.executeCommand('editor.action.copyLinesDownAction')
}

const createActionByNodeType = (parentNodeRange: NodeRange, editor: vscode.TextEditor) => {
	const childNodeRangeList: Array<NodeRange> = []
	let createAction = (targetNodeRange: NodeRange) => (edit: vscode.TextEditorEdit) => {
		const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
		edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + ',' + lineFeedOrSpace)
	}

	if (
		ts.isObjectLiteralExpression(parentNodeRange.node) ||
		ts.isArrayLiteralExpression(parentNodeRange.node)
	) {
		parentNodeRange.node.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})

	} else if ( // In case the cursor is at the name of the chaining method, for example "then" in Promise().then().catch()
		ts.isIdentifier(parentNodeRange.node) &&
		parentNodeRange.node.parent && ts.isPropertyAccessExpression(parentNodeRange.node.parent) &&
		parentNodeRange.node.parent.name === parentNodeRange.node &&
		parentNodeRange.node.parent.parent && ts.isCallExpression(parentNodeRange.node.parent.parent)
	) {
		childNodeRangeList.push({
			node: null,
			range: new vscode.Range(
				editor.document.positionAt(parentNodeRange.node.parent.expression.end),
				editor.document.positionAt(parentNodeRange.node.parent.parent.end)
			)
		})
		createAction = targetNodeRange => edit => {
			edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange))
		}

	} else if (ts.isCallExpression(parentNodeRange.node)) {
		if ( // In case the cursor is at the end of the chaining method
			parentNodeRange.node.parent && ts.isPropertyAccessExpression(parentNodeRange.node.parent) &&
			ts.isPropertyAccessExpression(parentNodeRange.node.expression) &&
			parentNodeRange.node.expression.expression
		) {
			childNodeRangeList.push({
				node: null,
				range: new vscode.Range(
					editor.document.positionAt(parentNodeRange.node.expression.expression.end),
					editor.document.positionAt(parentNodeRange.node.end)
				)
			})
			createAction = targetNodeRange => edit => {
				edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange))
			}

		} else {
			parentNodeRange.node.arguments.forEach(childNode => {
				childNodeRangeList.push(new NodeRange(childNode, editor.document))
			})
		}

	} else if (ts.isParameter(parentNodeRange.node)) {
		childNodeRangeList.push(new NodeRange(parentNodeRange.node, editor.document))

		if (
			ts.isArrowFunction(parentNodeRange.node.parent) &&
			parentNodeRange.node.parent.parameters.length === 1 &&
			parentNodeRange.node.parent.getFullText().trim().startsWith('(') === false
		) {
			createAction = targetNodeRange => edit => {
				const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
				edit.insert(targetNodeRange.range.start, '(' + getFullText(targetNodeRange) + ',' + lineFeedOrSpace)
				edit.insert(targetNodeRange.range.end, ')')
			}
		}

	} else if (ts.isCaseClause(parentNodeRange.node)) {
		parentNodeRange.node.statements.forEach(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + lineFeedOrSpace)
		}

	} else if (
		ts.isFunctionDeclaration(parentNodeRange.node) ||
		ts.isTypeAliasDeclaration(parentNodeRange.node) ||
		ts.isInterfaceDeclaration(parentNodeRange.node)
	) {
		childNodeRangeList.push(parentNodeRange)
		createAction = targetNodeRange => edit => {
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + lineFeedOrSpace)
		}

	} else if (
		ts.isBlock(parentNodeRange.node) ||
		ts.isSourceFile(parentNodeRange.node) ||
		ts.isModuleBlock(parentNodeRange.node) ||
		ts.isCaseBlock(parentNodeRange.node) ||
		ts.isArrowFunction(parentNodeRange.node)
	) {
		parentNodeRange.node.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			const fullText = getFullText(targetNodeRange)
			const semiColonNeeded = lineFeedOrSpace === ' ' && fullText.endsWith(';') === false

			if (ts.isArrowFunction(parentNodeRange.node)) {
				const afterPrevious = editor.document.positionAt(targetNodeRange.node.getFullStart())
				edit.insert(afterPrevious, ' {')

				if (lineFeedOrSpace.includes('\n')) {
					let lineText = editor.document.getText(new vscode.Range(targetNodeRange.range.end, editor.document.lineAt(targetNodeRange.range.end.line).range.end))
					const nextCharMatch = lineText.match(/\S/)
					if (nextCharMatch) {
						const beforeNext = new vscode.Position(targetNodeRange.range.end.line, targetNodeRange.range.end.character + nextCharMatch.index)
						edit.insert(beforeNext, '}')

					} else {
						let nonEmptyLine = editor.document.lineAt(targetNodeRange.range.end.line + 1)
						while (/\S/.test(nonEmptyLine.text) === false) {
							nonEmptyLine = editor.document.lineAt(nonEmptyLine.lineNumber + 1)
						}
						const beforeNext = new vscode.Position(nonEmptyLine.range.start.line, nonEmptyLine.range.start.character + nonEmptyLine.text.match(/\S/).index)
						edit.insert(beforeNext, '}')
					}

				} else {
					edit.insert(targetNodeRange.range.end, lineFeedOrSpace + '}')
				}

				edit.insert(targetNodeRange.range.start, fullText + (semiColonNeeded ? ';' : '') + lineFeedOrSpace + 'return ')

			} else {
				edit.insert(targetNodeRange.range.start, fullText + (semiColonNeeded ? ';' : '') + lineFeedOrSpace)
			}
		}

	} else if (
		ts.isBinaryExpression(parentNodeRange.node) &&
		[
			ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken,
			ts.SyntaxKind.AmpersandToken, ts.SyntaxKind.BarToken, ts.SyntaxKind.CaretToken,
			ts.SyntaxKind.LessThanLessThanToken, ts.SyntaxKind.GreaterThanGreaterThanToken, ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken,
			ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken,
		].indexOf(parentNodeRange.node.operatorToken.kind) >= 0
	) {
		[parentNodeRange.node.left, parentNodeRange.node.right].forEach(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const parentNode = parentNodeRange.node as ts.BinaryExpression
			const operator = parentNode.operatorToken.getFullText()
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + operator + lineFeedOrSpace)
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
				let thenText = getFullText(targetNodeRange)
				if (targetNodeRange.node.elseStatement) {
					const elseText = targetNodeRange.node.elseStatement.getText()
					thenText = thenText.substring(0, thenText.length - elseText.length)
				}
				edit.insert(targetNodeRange.range.start, thenText)

			} else { // In case of else-block
				edit.insert(targetNodeRange.range.start, 'if () ' + getFullText(targetNodeRange) + ' else ')
				const condition = targetNodeRange.range.start.translate({ characterDelta: 'if ('.length })
				defer(() => {
					editor.selections = [new vscode.Selection(condition, condition)]
				})
			}
		}

	} else if (ts.isTypeLiteralNode(parentNodeRange.node)) {
		parentNodeRange.node.members.forEach(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const separatorPattern = /(?:;|,)$/
			const separator = last(compact(childNodeRangeList.map(child => getFullText(child).match(separatorPattern)?.[0]))) ?? ''
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			const fullText = trim(getFullText(targetNodeRange).replace(separatorPattern, ''))
			edit.insert(targetNodeRange.range.start, fullText + separator + lineFeedOrSpace)
		}

	} else if (ts.isJsxAttributes(parentNodeRange.node)) {
		parentNodeRange.node.forEachChild(childNode => {
			childNodeRangeList.push(new NodeRange(childNode, editor.document))
		})
		createAction = targetNodeRange => edit => {
			const lineFeedOrSpace = getLineFeedConditionally(targetNodeRange, ' ')
			edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + lineFeedOrSpace)
		}

		// Edit the parent node as it caused a wrong calculation in `getLineFeedConditionally`
		parentNodeRange = new NodeRange(parentNodeRange.node.parent.tagName, editor.document)

	} else if (ts.isJsxElement(parentNodeRange.node) || ts.isJsxSelfClosingElement(parentNodeRange.node)) {
		parentNodeRange.node.forEachChild(childNode => {
			if (ts.isJsxAttributes(childNode) === false) {
				childNodeRangeList.push(new NodeRange(childNode as ts.Node, editor.document))
			}
		})
		createAction = targetNodeRange => edit => {
			if (
				ts.isJsxElement(parentNodeRange.node) && (targetNodeRange.node === parentNodeRange.node.openingElement || targetNodeRange.node === parentNodeRange.node.closingElement) ||
				ts.isJsxSelfClosingElement(parentNodeRange.node) && targetNodeRange.node === parentNodeRange.node.tagName
			) {
				const lineFeedOrEmpty = getLineFeedConditionally(targetNodeRange, '')
				edit.insert(parentNodeRange.range.start, parentNodeRange.node.getText() + lineFeedOrEmpty)

			} else if (ts.isJsxText(targetNodeRange.node)) {
				const lineFeed = getLineFeed(targetNodeRange)
				const currentLine = editor.document.lineAt(editor.selection.start.line)
				const currentLineExcludingIndentation = editor.document.lineAt(editor.selection.start.line).range.with({
					start: currentLine.range.start.with({ character: currentLine.firstNonWhitespaceCharacterIndex })
				})
				const lineOfText = targetNodeRange.range.intersection(currentLineExcludingIndentation)
				edit.insert(lineOfText.start, editor.document.getText(lineOfText).trim() + lineFeed)

			} else {
				const lineFeedOrEmpty = getLineFeedConditionally(targetNodeRange, '')
				edit.insert(targetNodeRange.range.start, getFullText(targetNodeRange) + lineFeedOrEmpty)
			}
		}
	}

	// Remove empty text elements as it caused a wrong calculation in `getLineFeedConditionally`
	remove(childNodeRangeList, item => item.node && ts.isJsxText(item.node) && item.node.containsOnlyTriviaWhiteSpaces)

	if (childNodeRangeList.length === 0) {
		return null
	}

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
			return createAction(first(lineMatchingNodeRangeList))

		} else if (currentLine.text.substring(editor.selection.active.character).trim().length === 0) {
			return createAction(last(lineMatchingNodeRangeList))
		}
	}

	function getFullText(targetNodeRange: NodeRange) {
		return editor.document.getText(targetNodeRange.range)
	}

	function getLineFeed(targetNodeRange: NodeRange) {
		const newLine = editor.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n'
		const indentation = editor.document.getText(new vscode.Range(
			targetNodeRange.range.start.with({ character: 0 }),
			targetNodeRange.range.start.with({ character: editor.document.lineAt(targetNodeRange.range.start.line).firstNonWhitespaceCharacterIndex }),
		))
		return newLine + indentation
	}

	function getLineFeedConditionally(targetNodeRange: NodeRange, defaultValue: string) {
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
		return getLineFeed(targetNodeRange)
	}
}

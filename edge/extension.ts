import * as vscode from 'vscode'

import { moveCursorUpOrDown } from './cursorMovementVertical'
import { moveCursorLeft, moveCursorRight } from './cursorMovementHorizontal'
import { deleteLeft, deleteRight } from './deletionBySpaces'
import { expandSelection, shrinkSelection } from './selection'
import { deleteLines } from './deletionByLines'
import { smartDelete } from './smartDelete'

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorUp', () => moveCursorUpOrDown(-1)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorDown', () => moveCursorUpOrDown(+1)))

	let cursorPairHistory: Array<vscode.Selection> = []

	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
		if (e.kind !== vscode.TextEditorSelectionChangeKind.Command) {
			cursorPairHistory.splice(0, cursorPairHistory.length)
		}
	}))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeft', () => moveCursorLeft(false)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeftSelect', () => moveCursorLeft(true)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRight', () => moveCursorRight(false)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRightSelect', () => moveCursorRight(true)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.selectExpand', () => expandSelection(cursorPairHistory)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.selectShrink', () => shrinkSelection(cursorPairHistory)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteLeft', deleteLeft))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteRight', deleteRight))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteLines', deleteLines))
	// context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cut', ))
	// context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.copy', ))

	// TODO: remove this
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.smartDelete', smartDelete))
}

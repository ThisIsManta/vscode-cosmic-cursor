import * as vscode from 'vscode'

import { moveCursor } from './moveCursor'
import { expandBlockSelection, shrinkBlockSelection } from './smartSelect'
import { duplicate } from './smartDuplicate'
import { moveOrSelectCursorByWordLeft, moveOrSelectCursorByWordRight } from './moveOrSelectCursorByWord'
import { deleteLeft, deleteRight } from './delete'
import { smartDelete } from './smartDelete'

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorUp', moveCursor(-1)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorDown', moveCursor(+1)))

	let cursorPairHistory: Array<vscode.Selection> = []

	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
		if (e.kind !== vscode.TextEditorSelectionChangeKind.Command) {
			cursorPairHistory.splice(0, cursorPairHistory.length)
		}
	}))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.smartSelect.expand', expandBlockSelection(cursorPairHistory)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.smartSelect.shrink', shrinkBlockSelection(cursorPairHistory)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.smartDuplicate', duplicate))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeft', moveOrSelectCursorByWordLeft(false)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeftSelect', moveOrSelectCursorByWordLeft(true)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRight', moveOrSelectCursorByWordRight(false)))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRightSelect', moveOrSelectCursorByWordRight(true)))

	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteLeft', deleteLeft))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteRight', deleteRight))
	context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.smartDelete', smartDelete))
}

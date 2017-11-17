import * as _ from 'lodash'
import * as vscode from 'vscode'

import { moveCursor } from './moveCursor'
import { expandBlockSelection, shrinkBlockSelection } from './smartSelect'
import { moveOrSelectCursorByWordLeft, moveOrSelectCursorByWordRight } from './moveOrSelectCursorByWord'

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

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeft', moveOrSelectCursorByWordLeft(false)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeftSelect', moveOrSelectCursorByWordLeft(true)))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRight', moveOrSelectCursorByWordRight(false)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRightSelect', moveOrSelectCursorByWordRight(true)))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteLeftStart', () => {
        if (!vscode.window.activeTextEditor) {
            return null
        }

        vscode.window.activeTextEditor.edit(edit => {
            edit.delete(new vscode.Range(
                vscode.window.activeTextEditor.selection.active.with({ character: 0 }),
                vscode.window.activeTextEditor.selection.active,
            ))
        })
    }))

}

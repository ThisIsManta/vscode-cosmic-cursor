import * as _ from 'lodash'
import * as vscode from 'vscode'

import { moveCursor } from './moveCursor'
import { selectCursorByBlock, shrinkCursorByBlock } from './selectCursorByBlock'
import { moveOrSelectCursorByWordLeft, moveOrSelectCursorByWordRight } from './moveOrSelectCursorByWord'
import { openSimilar, openPackage } from './files'

let openingEditors: Array<vscode.TextEditor> = []
let cursorPairHistory: Array<vscode.Selection> = []

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorUp', moveCursor(-1)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorDown', moveCursor(+1)))

    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => {
        if (e.kind !== vscode.TextEditorSelectionChangeKind.Command) {
            cursorPairHistory.splice(0, cursorPairHistory.length)
        }
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorUpSelect', selectCursorByBlock(cursorPairHistory)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorDownSelect', shrinkCursorByBlock(cursorPairHistory)))

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

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(activeEditor => {
        if (openingEditors.indexOf(activeEditor) >= 0) {
            openingEditors.splice(openingEditors.indexOf(activeEditor), 1)
        }
        openingEditors.unshift(activeEditor)
    }))

    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(closingDocument => {
        openingEditors = openingEditors.filter(editor => editor.document !== closingDocument)
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.openRecent', () => {
        const recentEditor = _.last(openingEditors.slice(0, 2))
        if (recentEditor) {
            vscode.window.showTextDocument(recentEditor.document, recentEditor.viewColumn)
        }
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.openSimilar', openSimilar))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.openPackage', openPackage))
}

export function deactivate() {
    openingEditors = null
    cursorPairHistory = null
}

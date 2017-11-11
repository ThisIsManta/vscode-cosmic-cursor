import * as _ from 'lodash'
import * as vscode from 'vscode'

import { cursorWordLeft, cursorWordRight } from './cursors'
import { openSimilar } from './files'

let openingEditors: Array<vscode.TextEditor> = []

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorUp', () => {
        vscode.commands.executeCommand('cursorMove', {
            to: 'up',
            value: 3,
            by: 'wrappedLine',
            select: false,
        })
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorDown', () => {
        vscode.commands.executeCommand('cursorMove', {
            to: 'down',
            value: 3,
            by: 'wrappedLine',
            select: false,
        })
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeft', cursorWordLeft(false)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordLeftSelect', cursorWordLeft(true)))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRight', cursorWordRight(false)))
    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.cursorWordRightSelect', cursorWordRight(true)))

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

    vscode.window.onDidChangeActiveTextEditor(activeEditor => {
        if (openingEditors.indexOf(activeEditor) >= 0) {
            openingEditors.splice(openingEditors.indexOf(activeEditor), 1)
        }
        openingEditors.unshift(activeEditor)
    })

    vscode.workspace.onDidCloseTextDocument(closingDocument => {
        openingEditors = openingEditors.filter(editor => editor.document !== closingDocument)
    })

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
}

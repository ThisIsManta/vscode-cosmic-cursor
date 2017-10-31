import * as fp from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as _ from 'lodash'
import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
    // let rootConfig: RootConfigurations

    function initialize() {
        // rootConfig = vscode.workspace.getConfiguration().get('cosmicCursor')
    }

    initialize()
    vscode.workspace.onDidChangeConfiguration(initialize)

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.moveCursorUp', () => {
        vscode.commands.executeCommand('cursorMove', {
            value: 3,
            by: 'wrappedLine',
            to: 'up',
            select: false,
        })
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.moveCursorDown', () => {
        vscode.commands.executeCommand('cursorMove', {
            value: 3,
            by: 'wrappedLine',
            to: 'down',
            select: false,
        })
    }))
}

export function deactivate() {
}

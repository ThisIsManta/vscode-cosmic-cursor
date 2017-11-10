import * as fp from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as _ from 'lodash'
import * as vscode from 'vscode'

let openingEditors: Array<vscode.TextEditor> = []

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

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.openSimilar', async () => {
        if (!vscode.window.activeTextEditor) {
            return null
        }

        const fileLink = vscode.window.activeTextEditor.document.uri
        const rootLink = vscode.workspace.getWorkspaceFolder(fileLink)
        if (!rootLink) {
            return null
        }

        const filePath = vscode.window.activeTextEditor.document.uri.fsPath
        const fileName = fp.basename(filePath)
        if (fileName.startsWith('.') || fileName.includes('.') === false) {
            return null
        }

        const relaPath = filePath.substring(rootLink.uri.fsPath.length)
        const dirxPath = fp.dirname(relaPath)
        const lazyName = fileName.replace(/\..+/, '')
        const lazyPath = (dirxPath + '/' + lazyName).replace(/\\/g, '/').replace(/^\//, '')

        const fileList = await vscode.workspace.findFiles(lazyPath + '.*')
        const selxRank = fileList.findIndex(nextLink => nextLink.fsPath === fileLink.fsPath)
        if (selxRank >= 0) {
            const nextLink = fileList.concat(fileList)[selxRank + 1]
            vscode.window.showTextDocument(nextLink)
        }
    }))

    context.subscriptions.push(vscode.commands.registerCommand('cosmicCursor.deleteLeftUntilStart', () => {
        if (!vscode.window.activeTextEditor) {
            return null
        }

        vscode.window.activeTextEditor.edit(edit => {
            edit.delete(new vscode.Range(
                vscode.window.activeTextEditor.selection.active.with({ character: 0 }),
                vscode.window.activeTextEditor.selection.active
            ))
        })
    }))
}

export function deactivate() {
    openingEditors = null
}

import * as fs from 'fs'
import * as fp from 'path'
import * as vscode from 'vscode'

export const openSimilar = async () => {
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
}

export const openPackage = () => {
	if (!vscode.window.activeTextEditor) {
		return null
	}

	const fileLink = vscode.window.activeTextEditor.document.uri
	const rootLink = vscode.workspace.getWorkspaceFolder(fileLink)
	if (!rootLink) {
		return null
	}

	const packPath = fp.join(rootLink.uri.fsPath, 'package.json')
	if (fs.existsSync(packPath)) {
		vscode.window.showTextDocument(vscode.Uri.file(packPath))
	} else {
		vscode.window.showErrorMessage('Cosmic Cursor: package.json file could not be found in your workspace root directory.')
	}
}

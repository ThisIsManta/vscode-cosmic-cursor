import * as _ from 'lodash'
import * as vscode from 'vscode'

const setCursorOrSelection = (lineRank: number, charRank: number, select: boolean) => {
	const cursor = new vscode.Position(lineRank, charRank)
	vscode.window.activeTextEditor.selection = new vscode.Selection(
		select ? vscode.window.activeTextEditor.selection.anchor : cursor,
		cursor
	)
}

const rsPairs = [
	'\\(\\s*\\)',
	'\\{\\s*\\}',
	'\\[\\s*\\]',
	'\'\\s*\'',
	'"\\s*"',
	'`\\s*`',
]
const rePairs = RegExp(rsPairs.join('|'))

// The following code is copied from https://github.com/lodash/lodash/blob/4.17.4/lodash.js#L206
const rsAstralRange = '\\ud800-\\udfff',
	rsComboMarksRange = '\\u0300-\\u036f',
	reComboHalfMarksRange = '\\ufe20-\\ufe2f',
	rsComboSymbolsRange = '\\u20d0-\\u20ff',
	rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
	rsDingbatRange = '\\u2700-\\u27bf',
	rsLowerRange = 'a-z\\xdf-\\xf6\\xf8-\\xff',
	rsMathOpRange = '\\xac\\xb1\\xd7\\xf7',
	rsNonCharRange = '\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',
	rsPunctuationRange = '\\u2000-\\u206f',
	rsSpaceRange = ' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',
	rsUpperRange = 'A-Z\\xc0-\\xd6\\xd8-\\xde',
	rsVarRange = '\\ufe0e\\ufe0f',
	rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange

// The following code is copied from https://github.com/lodash/lodash/blob/4.17.4/lodash.js#L222
const rsApos = "['\u2019]",
	rsAstral = '[' + rsAstralRange + ']',
	rsBreak = '[' + rsBreakRange + ']',
	rsCombo = '[' + rsComboRange + ']',
	rsDigits = '\\d+',
	rsDingbat = '[' + rsDingbatRange + ']',
	rsLower = '[' + rsLowerRange + ']',
	rsMisc = '[^' + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + ']',
	rsFitz = '\\ud83c[\\udffb-\\udfff]',
	rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
	rsNonAstral = '[^' + rsAstralRange + ']',
	rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
	rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
	rsUpper = '[' + rsUpperRange + ']',
	rsZWJ = '\\u200d'

// The following code is copied from https://github.com/lodash/lodash/blob/4.17.4/lodash.js#L239
const rsMiscLower = '(?:' + rsLower + '|' + rsMisc + ')',
	rsMiscUpper = '(?:' + rsUpper + '|' + rsMisc + ')',
	rsOptContrLower = '(?:' + rsApos + '(?:d|ll|m|re|s|t|ve))?',
	rsOptContrUpper = '(?:' + rsApos + '(?:D|LL|M|RE|S|T|VE))?',
	reOptMod = rsModifier + '?',
	rsOptVar = '[' + rsVarRange + ']?',
	rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
	rsOrdLower = '\\d*(?:(?:1st|2nd|3rd|(?![123])\\dth)\\b)',
	rsOrdUpper = '\\d*(?:(?:1ST|2ND|3RD|(?![123])\\dTH)\\b)',
	rsSeq = rsOptVar + reOptMod + rsOptJoin,
	rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq,
	rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')'

// The following code is copied and slightly modified from https://github.com/lodash/lodash/blob/4.17.4/lodash.js#L265
const reUnicodeWord = RegExp([
	rsUpper + '?' + rsLower + '+' + rsOptContrLower + '(?=' + [rsBreak, rsUpper, '$'].join('|') + ')',
	rsMiscUpper + '+' + rsOptContrUpper + '(?=' + [rsBreak, rsUpper + rsMiscLower, '$'].join('|') + ')',
	rsUpper + '?' + rsMiscLower + '+' + rsOptContrLower,
	rsUpper + '+' + rsOptContrUpper,
	rsOrdUpper,
	rsOrdLower,
	rsDigits,
	rsEmoji,
	...rsPairs, // Note that this is my improvisation
].join('|'), 'g')

const splitWordsOrPairs = (text: string, excludePairs: boolean) => {
	return (text.match(reUnicodeWord) || []).filter(word => !(excludePairs && rePairs.test(word)))
}

export const moveOrSelectCursorByWordLeft = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active.with({ character: 0 }),
		editor.selection.active,
	))

	const wordList = splitWordsOrPairs(lineText, select)
	if (wordList.length > 0) {
		const lastWord = _.last(wordList)
		const lastLong = lastWord.length
		let lastRank = lineText.lastIndexOf(lastWord)

		if (rePairs.test(lastWord)) {
			lastRank -= lastLong + 1
		}

		if (lastRank + lastLong === editor.selection.active.character || /^\s+$/.test(lineText.substring(lastRank + lastLong))) {
			return setCursorOrSelection(lineRank, lastRank, select)

		} else {
			return setCursorOrSelection(lineRank, lastRank + lastLong, select)
		}

	} else if (lineText.trim().length > 0) {
		return setCursorOrSelection(lineRank, editor.document.lineAt(lineRank).firstNonWhitespaceCharacterIndex, select)
	}

	while (true) {
		const wordList = splitWordsOrPairs(lineText, select)
		if (wordList.length === 0) {
			if (lineRank === 0) {
				break

			} else {
				lineRank -= 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		const wordText = _.last(wordList)
		let wordRank = lineText.lastIndexOf(wordText) + wordText.length
		if (rePairs.test(wordText)) {
			wordRank = wordRank - wordText.length + 1
		}

		return setCursorOrSelection(lineRank, wordRank, select)
	}
}

export const moveOrSelectCursorByWordRight = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	let lineRank = editor.selection.active.line
	let lineText = editor.document.getText(new vscode.Range(
		editor.selection.active,
		editor.document.lineAt(editor.selection.active.line).range.end,
	))

	const wordList = splitWordsOrPairs(lineText, select)
	if (wordList.length > 0) {
		const leadWord = wordList[0]
		const leadLong = leadWord.length
		let leadRank = lineText.indexOf(wordList[0])

		const baseRank = editor.selection.active.character

		if (rePairs.test(leadWord)) {
			leadRank += 1
		}

		if (leadRank === 0 || /^\s+$/.test(lineText.substring(0, leadRank))) {
			return setCursorOrSelection(lineRank, baseRank + leadRank + leadLong, select)

		} else {
			return setCursorOrSelection(lineRank, baseRank + leadRank, select)
		}

	} else if (lineText.trim().length > 0) {
		return setCursorOrSelection(lineRank, editor.document.lineAt(lineRank).range.end.character, select)
	}

	while (true) {
		const wordList = splitWordsOrPairs(lineText, select)
		if (wordList.length === 0) {
			if (lineRank === editor.document.lineCount - 1) {
				break

			} else {
				lineRank += 1
				lineText = editor.document.lineAt(lineRank).text
				continue
			}
		}

		const wordText = _.first(wordList)
		let wordRank = lineText.indexOf(wordText)
		if (rePairs.test(wordText)) {
			wordRank = wordRank + 1
		}

		return setCursorOrSelection(lineRank, wordRank, select)
	}
}

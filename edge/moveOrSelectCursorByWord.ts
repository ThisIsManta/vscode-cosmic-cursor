import first from 'lodash/first'
import last from 'lodash/last'
import * as vscode from 'vscode'

const rsPairs = [
	'\\(\\s*\\)',
	'\\{\\s*\\}',
	'\\[\\s*\\]',
	'\'\\s*\'',
	'"\\s*"',
	'`\\s*`',
]
const rePairs = RegExp(rsPairs.join('|'))

const rsQuotes = [
	'\'', '"', '`'
]
const reQuotes = RegExp(rsQuotes.join('|'))

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
	rsEmoji = '(?:' + [rsDingbat, rsRegional, rsSurrPair].join('|') + ')' + rsSeq

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

const newCursorOrSelection = (cursor: vscode.Selection, lineRank: number, charRank: number, select: boolean) => {
	const active = new vscode.Position(lineRank, charRank)
	return new vscode.Selection(
		select ? cursor.anchor : active,
		active,
	)
}

export const moveOrSelectCursorByWordLeft = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	editor.selections = editor.selections.map(cursor => {
		let lineRank = cursor.active.line
		let lineText = editor.document.getText(new vscode.Range(
			cursor.active.with({ character: 0 }),
			cursor.active,
		))

		const wordList = splitWordsOrPairs(lineText, select)
		if (wordList.length > 0) {
			const lastWord = last(wordList)
			const lastLong = lastWord.length
			const lastRank = lineText.lastIndexOf(lastWord)

			if (rePairs.test(lastWord) && lastRank + 1 !== cursor.active.character) {
				return newCursorOrSelection(cursor, lineRank, lastRank + 1, select)
			}

			const checkIfCursorIsAtNextWord = () => {
				const restText = editor.document.getText(new vscode.Range(
					cursor.active,
					editor.document.lineAt(cursor.active.line).range.end
				))
				const restList = splitWordsOrPairs(restText, select)
				if (restList.length > 0 && restText.indexOf(restList[0]) === 0) {
					return true
				}
			}

			if (lastRank + lastLong === cursor.active.character || /^(\s+|\.)$/.test(lineText.substring(lastRank + lastLong)) || checkIfCursorIsAtNextWord()) {
				return newCursorOrSelection(cursor, lineRank, lastRank, select)
			}

			return newCursorOrSelection(cursor, lineRank, lastRank + lastLong, select)

		} else if (lineText.trim().length > 0) {
			return newCursorOrSelection(cursor, lineRank, editor.document.lineAt(lineRank).firstNonWhitespaceCharacterIndex, select)
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

			const wordText = last(wordList)
			const wordRank = lineText.lastIndexOf(wordText)

			if (reQuotes.test(wordText) || rePairs.test(wordText)) {
				return newCursorOrSelection(cursor, lineRank, wordRank + 1, select)
			}

			return newCursorOrSelection(cursor, lineRank, wordRank + wordText.length, select)
		}

		return cursor
	})
}

export const moveOrSelectCursorByWordRight = (select: boolean) => async () => {
	const editor = vscode.window.activeTextEditor
	editor.selections = editor.selections.map(cursor => {
		let lineRank = cursor.active.line
		let lineText = editor.document.getText(new vscode.Range(
			cursor.active,
			editor.document.lineAt(cursor.active.line).range.end,
		))

		const wordList = splitWordsOrPairs(lineText, select)
		if (wordList.length > 0) {
			const leadWord = wordList[0]
			const leadLong = leadWord.length
			const leadRank = lineText.indexOf(wordList[0])

			const baseRank = cursor.active.character

			if (rePairs.test(leadWord) && baseRank + leadRank + 1 !== cursor.active.character) {
				return newCursorOrSelection(cursor, lineRank, baseRank + leadRank + 1, select)
			}

			const checkIfCursorIsAtLastWord = () => {
				const restText = editor.document.getText(new vscode.Range(
					cursor.active.with({ character: 0 }),
					cursor.active,
				))
				const restList = splitWordsOrPairs(restText, select)
				if (restList.length > 0 && restText.lastIndexOf(last(restList)) + last(restList).length === restText.length) {
					return true
				}
			}

			if (leadRank === 0 || /^(\s+|\.)$/.test(lineText.substring(0, leadRank)) || checkIfCursorIsAtLastWord()) {
				return newCursorOrSelection(cursor, lineRank, baseRank + leadRank + leadLong, select)
			}

			return newCursorOrSelection(cursor, lineRank, baseRank + leadRank, select)

		} else if (lineText.trim().length > 0) {
			return newCursorOrSelection(cursor, lineRank, editor.document.lineAt(lineRank).range.end.character, select)
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

			const wordText = first(wordList)
			const wordRank = lineText.indexOf(wordText)

			if (reQuotes.test(wordText) || rePairs.test(wordText)) {
				return newCursorOrSelection(cursor, lineRank, wordRank + 1, select)
			}

			return newCursorOrSelection(cursor, lineRank, wordRank, select)
		}

		return cursor
	})
}

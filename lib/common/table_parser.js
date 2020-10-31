module.exports = {
  getFirstTable: getFirstTable,
  parseWikiTable: parseWikiTable,
  tableToRows: tableToRows
}

function getFirstTable (lines) {
  let afterFirstTable = false
  let inTable = false
  return lines.filter(function (line) {
    if (afterFirstTable) return false
    if (line === '{| class="wikitable"') { inTable = true }

    if (inTable && line === ' |}') {
      inTable = false
      afterFirstTable = true
      return true
    }

    return inTable
  })
}

function tableToRows (lines) {
  lines = lines.slice(1)
  if (lines[0].trim().startsWith('|-')) { lines.shift() }
  const rows = []
  let currentRow = []
  lines.forEach(function (line) {
    if (line.trim().startsWith('|-') || line === ' |}') {
      rows.push(currentRow)
      currentRow = []
    } else currentRow.push(line)
  })
  if (currentRow.length !== 0 && currentRow[0].trim() !== '') rows.push(currentRow)
  return rows
}

// output format : one object by line, repetition of the row in case of rowspan>1 (for example repetition of Packet Id)
// for colspan>1 : [first element,second element] or {colName:first element,...} if ! are given
// need to implement colspan
function rowsToSimpleRows (rows) {
  // for recursive arrays ( / colspan ) : have a currentCols : no : rec
  const rawCols = rows[0]
  const colNames = rawCols.map(function (rawCol) {
    return rawCol.split('!')[1].trim()
  })

  // for rowspan
  const currentValues = {}
  return rows.slice(1).map(function (row) {
    let currentColValue = ''
    let currentColRemaining = 0

    const colToAdd = colNames.length - row.length
    let i
    for (i = 0; i < colToAdd; i++) if (currentValues[i] !== undefined && currentValues[i].n > 0) row.unshift('')
    const fields = []
    for (i = 0; i < row.length; i++) {
      let col = row[i]
      col = col.substring(2)
      var parts, value, n
      if (col.indexOf('colspan') !== -1) {
        parts = col.split('|')
        value = parts[1].trim()
        n = parts[0].replace(/^.*colspan="([0-9]+)".*/, '$1')
        currentColValue = value
        currentColRemaining = n
      } else if (col.indexOf('rowspan') !== -1) {
        parts = col.split('|')
        value = parts[1].trim()
        n = parts[0].replace(/^.*rowspan="([0-9]+)".*/, '$1')
        currentValues[i] = { n: n, value: value }
      }
      if (currentValues[i] !== undefined && currentValues[i].n > 0) {
        currentValues[i].n--
        fields.push(currentValues[i].value)
      } else if (currentColRemaining !== 0) {
        while (currentColRemaining > 0) {
          fields.push(currentColValue)
          currentColRemaining--
        }
      } else fields.push(col.trim())
    }
    return fields.reduce(function (values, value, i) {
      values[colNames[i]] = value
      return values
    }, {})
  })
}

function parseWikiTable (lines) {
  const rows = tableToRows(lines)
  return rowsToSimpleRows(rows)
}

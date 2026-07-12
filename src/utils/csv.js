/**
 * Generic CSV serialiser + browser download.
 * Used by the Reports "Export CSV" feature — works on any array of records.
 */

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Quote when it contains a comma, quote, newline or leading/trailing space.
  if (/[",\n\r]/.test(str) || /^\s|\s$/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Convert an array of objects into a CSV string given a columns spec. */
export function toCSV(rows, columns) {
  if (!rows || rows.length === 0) {
    const headers = columns.map((c) => escapeCell(c.header)).join(',')
    return `${headers}\n`
  }
  const headerLine = columns.map((c) => escapeCell(c.header)).join(',')
  const dataLines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = typeof c.value === 'function' ? c.value(row) : row[c.value]
        return escapeCell(raw)
      })
      .join(','),
  )
  return [headerLine, ...dataLines].join('\n')
}

/** Trigger a browser download of the given text content. */
export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Convenience: serialise + download in one call. */
export function exportCSV(filename, rows, columns) {
  downloadCSV(filename, toCSV(rows, columns))
}

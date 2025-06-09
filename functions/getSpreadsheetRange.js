function getSpreadsheetRange(startColumnIndex, endColumnIndex, rowIndex) {
  function columnIndexToLetter(columnIndex) {
    let letter = "";
    while (columnIndex >= 0) {
      letter = String.fromCharCode((columnIndex % 26) + 65) + letter;
      columnIndex = Math.floor(columnIndex / 26) - 1;
    }
    return letter;
  }

  const adjustedEndColumnIndex = endColumnIndex -1; // Adjust only endColumnIndex

  const startColumnLetter = columnIndexToLetter(startColumnIndex);
  const endColumnLetter = columnIndexToLetter(adjustedEndColumnIndex);
  const adjustedRowIndex = rowIndex + 1; // Increment rowIndex by 1
  return `${startColumnLetter}${adjustedRowIndex}:${endColumnLetter}${adjustedRowIndex}`;
}
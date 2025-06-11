function getValueFromMapping(columnValues, columnMapping, masterHeaderRow) {
  const result = [];

  masterHeaderRow.forEach(header => {
    const columnIndex = columnMapping[header];
    if (columnIndex!== undefined && columnIndex!== "-1") {
      const value = columnValues[parseInt(columnIndex) - 1];
      result.push(value);
    } else {
      result.push("-"); // Or another default value if you prefer
    }
  });

  return result;
}
function compareAndMergeArrays(masterDataArray, columnValues, columnMapping, masterHeaderRow, rowIndex) {
  // Check if the input arrays are valid
  if (!Array.isArray(masterDataArray) ||!Array.isArray(columnValues)) {
    throw new Error("Invalid input: Both arguments must be arrays.");
  }

  // Check if the relevant parts of the arrays are identical
  let areIdentical = true;
  for (let i = 0; i < masterDataArray.length; i++) {
    const columnIndex = parseInt(columnMapping[masterHeaderRow[i]]);
    if (columnIndex!== -1 && masterDataArray[i]!== columnValues[columnIndex - 1]) {
      areIdentical = false;
      break;
    }
  }
  if (areIdentical) {
    return "The arrays are identical.";
  }

  // Initialize the result array
  const resultArray = [];

  // Iterate over the masterDataArray and compare items with corresponding columnValues
  for (let i = 0; i < masterDataArray.length; i++) {
    let columnIndex = parseInt(columnMapping[masterHeaderRow[i]]); // Get the column index from columnMapping
    if (columnIndex!== -1) {
      columnIndex--; // Adjust the index to be 0-based

      if (columnIndex === -1) { // If columnIndex is -1 after adjustment
        resultArray.push(masterDataArray[i]); // Directly use the masterDataArray value
      } else if (columnValues[columnIndex] === undefined || columnValues[columnIndex] === "" || columnValues[columnIndex] === null) {
        resultArray.push(masterDataArray[i]); // Use masterDataArray item if columnValues item is empty
      } else if (columnValues[columnIndex]!== masterDataArray[i]) {
        resultArray.push(masterDataArray[i]); // Use masterDataArray item if items are different
      } else {
        resultArray.push(columnValues[columnIndex]); // Otherwise, use columnValues item (items are the same)
      }
    }
  }

  // Initialize the outputArray as a deep copy of columnValues
  const outputArray = JSON.parse(JSON.stringify(columnValues));

  // Initialize an array to store the cell update objects
  const cellUpdates = [];

  // Update the outputArray and collect cell update objects
  for (let i = 0; i < masterHeaderRow.length; i++) {
    let columnIndex = parseInt(columnMapping[masterHeaderRow[i]]);
    if (columnIndex!== -1) {
      columnIndex--; // Adjust the index to be 0-based

      // Update outputArray with the corresponding value from resultArray
      outputArray[columnIndex] = resultArray[i];

      // Add the cell update object to the array
      cellUpdates.push({
        rowIndex: rowIndex,
        columnIndex: columnIndex,
        value: resultArray[i]
      });
    }
  }

  return cellUpdates; // Return the array of cell update objects
}
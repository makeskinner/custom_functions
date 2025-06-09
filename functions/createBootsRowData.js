function createBootsRowData(data) {
  const headers = data[0]; // Extract the first row as headers
  const dataRows = data.slice(1); // Extract all rows after the header

  const result = [];

  for (const row of dataRows) {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = row[i];
    }
    result.push(obj);
  }

  return result;
}
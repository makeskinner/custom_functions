function findColumnIndex(inputArray, searchTerm) {
  const regex = new RegExp(`^${searchTerm}$`); // Create a regex to match the exact searchTerm
  for (const item of inputArray) { 
    if (regex.test(item.value)) { // Use the regex to test for an exact match
      return String(item.__IMTINDEX__);
    }
  }
  return "-1"; // No match found
}
function categorizeStatus(csvString) {
  // Return "Not Started" if the input is empty, null, or undefined.
  if (!csvString) {
    return "Not Started";
  }

  // The presence of "Stuck" or "Customer" overrides everything else.
  if (csvString.includes("Stuck") || csvString.includes("Customer")) {
    return "Stuck";
  }

  // Convert the string to a clean array of statuses.
  const statuses = csvString.split(',').map(status => status.trim());

  // If ANY item is "Working on it", the overall status is "Working on it".
  // This correctly handles your test case: "Done, Done, Working on it, Done".
  if (statuses.includes("Working on it")) {
    return "Working on it";
  }

  // If we are here, it means nothing is "Stuck" or "Working on it".
  // Now, we check for a completed state.
  if (statuses.every(status => status === "Done")) {
    return "Done";
  }

  // If ALL items are "To do", the project hasn't started.
  if (statuses.every(status => status === "To do")) {
    return "Not Started";
  }

  // ADDED LOGIC: Catches a mix of "Done" and "To do". This state implies
  // the work is in progress, so "Working on it" is the most logical category.
  if (statuses.includes("Done") && statuses.includes("To do")) {
    return "Working on it";
  }
  
  // A fallback for any unexpected combination of statuses.
  return "Undefined";
}

// Example usage with the provided object's value:
const mappable_column_values = {
    "lookup_mksewh5b": "Done, Done, Working on it, Done"
};

// const category = categorizeStatus(mappable_column_values.lookup_mksewh5b);
// console.log(category)
// Expected output for this example: "Not Started"
// To use in Make, you would pass the mapped value to the function.
// For example: return categorizeStatus(input.mappable_column_values.lookup_mksewh5b);
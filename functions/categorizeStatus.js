// Text comment
function categorizeStatus(csvString) {
  if (!csvString) {
    return "Not Started";
  }

  if (csvString.includes("Stuck") || csvString.includes("Customer")) {
    return "Stuck";
  }

  const statuses = csvString.split(',').map(status => status.trim());

  if (statuses.includes("Working on it")) {
    return "Working on it";
  }

  if (statuses.every(status => status === "Done")) {
    return "Done";
  }

  if (statuses.every(status => status === "To do")) {
    return "Not Started";
  }

  if (statuses.includes("Done") && statuses.includes("To do")) {
    return "Working on it";
  }

  return "Undefined";
}
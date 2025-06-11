function mergedPDFInput(data) {
  // Check if input is a string
  if (typeof data === 'string') {
    // Parse the JSON string
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.error("Error parsing JSON data:", error);
      // Handle parsing error (e.g., return an empty array or throw a custom error)
      return []; // Example: returning an empty array on parsing error
    }
  }
  
  const results = [];
  let currentEntry = null;

  for (const entry of data) {
    const fullName = entry.FullName;
    const afiliacionSS = entry.AfiliacionSS;
    const urls = entry.urls;

    if (!currentEntry || fullName !== currentEntry.FullName || afiliacionSS !== currentEntry.AfiliacionSS) {
      // If there's no current entry or the identifiers don't match, create a new one
      results.push({
        FullName: fullName,
        AfiliacionSS: afiliacionSS,
        urls: urls,
      });
      currentEntry = results[results.length - 1]; // Update currentEntry
    } else {
      // If identifiers match, append urls to the existing entry
      currentEntry.urls.push(...urls);
    }
  }

  return results;
}

function calculateAndOffsetDate(oldDate, newDate, offsetDate, timeString) {
  // Convert date strings to Date objects
  const oldDateObj = new Date(oldDate);
  const newDateObj = new Date(newDate);
  const offsetDateObj = new Date(offsetDate);

  // Calculate difference in days
  const timeDiff = newDateObj.getTime() - oldDateObj.getTime();
  const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));

  // Offset the third date by the calculated difference
  offsetDateObj.setDate(offsetDateObj.getDate() + daysDiff);

  // If timeString is provided, set the time
  if (timeString) {
    const timeParts = timeString.split(':');
    offsetDateObj.setHours(timeParts[0], timeParts[1], timeParts[2]);
  } else {
    // Set time to midnight if no timeString is provided
    offsetDateObj.setHours(0, 0, 0, 0);
  }

  // Updated the comment : MS 2025-06-10 16:17
  // Get the ISO string
  const isoString = offsetDateObj.toISOString();

  // Check if timeString is provided
  if (timeString) {
    return isoString; // Return full ISO string with time
  } else {
    // Extract the date part (YYYY-MM-DD)
    const dateOnly = isoString.split('T')[0]; //comment
    return dateOnly; // Return date only
  }
}
function generatedEmailArray(name, domain, numEmails = 4) {
  const [firstName, lastName] = name;
  const emails = new Set(); // Use a Set to store unique email addresses

  while (emails.size < numEmails) {
    // Generate random number of letters from first name (1 or more)
    const firstNameLength = Math.floor(Math.random() * firstName.length) + 1;
    const firstNamePart = firstName.slice(0, firstNameLength);

    // Generate random number of letters from last name (3 or more)
    const lastNameLength = Math.floor(Math.random() * (lastName.length - 2)) + 3;
    const lastNamePart = lastName.slice(0, lastNameLength);

    // Combine and create email address
    const email = `${firstNamePart}.${lastNamePart}@${domain}`;

    // Add email to Set, if unique it will be added
    emails.add(email);
  }

  return Array.from(emails); // Convert Set back to an array
}
function prepareGitBlobForHashing(str) {
  // Return early if input is invalid
  if (typeof str !== 'string') {
    return ""; 
  }

  // --- Part 1: Calculate the byte length ---
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      byteLength += 1;
    } else if (code < 0x800) {
      byteLength += 2;
    } else if (code < 0xd800 || code >= 0xe000) {
      byteLength += 3;
    } else {
      i++;
      byteLength += 4;
    }
  }

  // --- Part 2: Assemble and return the final string ---
  // In JavaScript, '\0' correctly creates the required null character.
  const header = "blob " + byteLength + "\0";
  return header + str;
}
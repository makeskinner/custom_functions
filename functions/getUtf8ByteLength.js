function getUtf8ByteLength(str) {
  // This function calculates the UTF-8 byte length of a string.
  if (typeof str !== 'string') {
    return 0; // Return 0 if input is not a string
  }
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Determine byte size based on character code
    if (code < 0x80) {
      byteLength += 1;
    } else if (code < 0x800) {
      byteLength += 2;
    } else if (code < 0xd800 || code >= 0xe000) {
      byteLength += 3;
    } else {
      // Handle surrogate pairs (4 bytes for characters like emojis)
      i++;
      byteLength += 4;
    }
  }
  return byteLength;
}

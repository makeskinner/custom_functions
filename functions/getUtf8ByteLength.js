// This function safely calculates the UTF-8 byte length of a string.
function getUtf8ByteLength(str) {
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

// This line makes the function available to other files that 'require' it.
// Comment out when committing, otherwise Make will throw an error!
// module.exports = getUtf8ByteLength;
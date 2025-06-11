function gitBlobSha(fileContent) {
  // The header is "blob", a space, the byte length of the content, and a null character.
  const header = `blob ${Buffer.byteLength(fileContent, 'utf8')}\0`;
  
  // Combine the header and the file content.
  const dataToHash = header + fileContent;
  
  // Use Node.js's built-in crypto library to calculate the SHA-1 hash.
  const crypto = require('crypto');
  const sha1 = crypto.createHash('sha1').update(dataToHash, 'utf8').digest('hex');
  
  return sha1;
}
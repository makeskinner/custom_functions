function whitespaceremover(input) {
    if (!input || typeof input !== "string") {
        return "";
    }
    // Replace line breaks with spaces, then collapse multiple spaces into one
    return input
        .replace(/[\r\n]+/g, " ")   // remove returns (both \r and \n)
        .replace(/\s+/g, " ")       // collapse multiple spaces into one
        .trim();                    // remove leading/trailing spaces
}
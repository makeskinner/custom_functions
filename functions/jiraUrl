function jiraUrl(text) {
  // Regular expression to match URLs
  const urlRegex = /(?:(?:https?|ftp):\/\/)?[\w\-_]+(?:\.[\w\-_]+)+([^\s]*)?/gi;

  // Function to replace a matched URL with a clickable Jira link format
  const replaceUrl = (match) => `[${match}](${match})`; // Use backreferences for URL display

  // Replace URLs with formatted links directly
  return text.replace(urlRegex, replaceUrl);
}
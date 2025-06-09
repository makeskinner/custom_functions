function labelhyperlink(label,url) {
    if (!label || !url) {
        throw new Error("Both label and URL are required.");
    }
    // Escape quotes in label or URL if needed
    const escapedLabel = label.replace(/"/g, '""');
    const escapedUrl = url.replace(/"/g, '""');
    return `=HYPERLINK("${escapedUrl}", "${escapedLabel}")`;
}
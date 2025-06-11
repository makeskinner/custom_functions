function sumBytes(values) {
  var totalBytes = 0;
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    var match = value.match(/(\d+(?:\.\d+)*)\s*([KMGTP]*B)/);
    if (match) {
      var number = parseFloat(match[1]);
      var unit = match[2];
      switch (unit) {
        case 'B':
          totalBytes += number;
          break;
        case 'KB':
          totalBytes += number * 1024;
          break;
        case 'MB':
          totalBytes += number * 1024 * 1024;
          break;
        case 'GB':
          totalBytes += number * 1024 * 1024 * 1024;
          break;
        case 'TB':
          totalBytes += number * 1024 * 1024 * 1024 * 1024;
          break;
        case 'PB':
          totalBytes += number * 1024 * 1024 * 1024 * 1024 * 1024;
          break;
      }
    }
  }

  if (totalBytes >= 1024 * 1024 * 1024 * 1024 * 1024) {
    return (totalBytes / (1024 * 1024 * 1024 * 1024 * 1024)).toFixed(2) + " PB";
  } else if (totalBytes >= 1024 * 1024 * 1024 * 1024) {
    return (totalBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
  } else if (totalBytes >= 1024 * 1024 * 1024) {
    return (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else if (totalBytes >= 1024 * 1024) {
    return (totalBytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (totalBytes >= 1024) {
    return (totalBytes / 1024).toFixed(2) + " KB";
  } else {
    return totalBytes + " B";
  }
}
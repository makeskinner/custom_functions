function findMissingFiles(parent1, parent2) {
  const missingFiles = [];

  // No need to access .array here, as we're dealing with the array directly
  const subfolders1 = JSON.parse(parent1); 
  const subfolders2 = JSON.parse(parent2);

  for (const folder1 of subfolders1) {
    const folderName = folder1.FolderName; // Access FolderName property
    const files1 = folder1.Files; // Access Files property

    const folder2 = subfolders2.find(folder => folder.FolderName === folderName);

    if (folder2) {
      const validFiles2 = folder2.Files.filter(file => file && file.name !== null);
      const fileNames2 = validFiles2.map(file => file.name);

      const missingInFolder2 = files1.filter(file1 => {
        return !fileNames2.includes(file1.name);
      });

      missingFiles.push({
        "Folder Name": folderName,
        "Missing Files": missingInFolder2
      });
    } else {
      missingFiles.push({
        "Folder Name": folderName,
        "Missing Files": files1
      });
    }
  }

  return missingFiles;
}
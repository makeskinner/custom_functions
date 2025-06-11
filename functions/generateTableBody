function generateTableBody(data) {
  let tableBody = "";

  for (const item of data) {
    let rowHTML = "<tr>";
    for (const entry of item.entry) {
      rowHTML += `<td>${entry.value}</td>`;
    }
    rowHTML += "</tr>";
    tableBody += rowHTML;
  }

  return tableBody;
}
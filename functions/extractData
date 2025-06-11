function extractData(sharedStringsJson, worksheetDataJson, targetHeaders) {
   const extractedData = [];
   const errors = [];

   const sharedStrings = JSON.parse(sharedStringsJson);
   const worksheetData = JSON.parse(worksheetDataJson);

   function getCellValue(cell, sharedStrings) {
      try {
         if (cell._attributes && cell._attributes.t === 's') {
            const sharedStringIndex = cell.v[0];
            const sharedString = sharedStrings[sharedStringIndex];

            if (sharedString.t) {
               if (typeof sharedString.t[0] === 'string') {
                  try {
                     return sharedString.t[0].replace(/\n|\r/g, '').trim();
                  } catch (error) {
                     console.error("Error extracting cell value:", "Cell:", cell);
                  }
               } else if (typeof sharedString.t[0]._value === 'string') {
                  try {
                     return sharedString.t[0]._value.replace(/\n|\r/g, '').trim();
                  } catch (error) {
                     console.error("Error extracting cell value:", "Cell:", cell);
                  }
               }
            } else if (sharedString.r) {
                if (typeof sharedString.r[0].t[0]._value === 'string') {
                   try {
                      return sharedString.r[0].t[0]._value.replace(/\n|\r/g, '').trim();
                   } catch (error) {
                      console.error("Error extracting cell value:", "Cell:", cell);
                   }
                } else if (typeof sharedString.r[0].t[0] === 'string') {
                   try {
                      return sharedString.r[0].t[0].replace(/\n|\r/g, '').trim();
                   } catch (error) {
                      console.error("Error extracting cell value:", "Cell:", cell);
                   }
                }
             } else {
                console.warn("Invalid shared string format:", sharedString);
                return null;
             }
          } else if (cell.v && Array.isArray(cell.v) && cell.v.length > 0) {
             try {
                return cell.v[0].replace(/\n|\r/g, '');
             } catch (error) {
                console.error("Error extracting cell value:", "Cell:", cell);
             }
          } else {
             console.warn("Invalid cell format:", cell);
             return null;
          }
     } catch (error) {
        console.log("sharedString t: ", sharedStrings[cell.v[0]].t)
        console.error("Last Catch: Error extracting cell value:", "CellRef:", cell);
        return null;
     }
  }
  
   worksheetData.forEach(sheet => {
      if (!sheet.worksheet || !sheet.worksheet.sheetData) {
         errors.push("Invalid worksheet data structure: Missing properties");
         console.error("Missing properties in worksheet data");
         return;
      }

      sheet.worksheet.sheetData.forEach(sheetData => {
         if (!sheetData.row) {
            errors.push("Invalid worksheet data structure: Missing 'row' property");
            console.error("Missing 'row' property");
            return;
         }

         sheetData.row.forEach(row => {
            if (!row.c || !Array.isArray(row.c)) {
               // console.warn("Row has no cells or invalid cell format, skipping.");
               return;
            }

            const rowData = {};
            for (let i = 0; i < row.c.length; i++) {
               const cell = row.c[i];
               console.log("cell length:", row.c.length, "Getting index:", i)
               const cellValue = getCellValue(cell, sharedStrings);
               console.log("cellValue:", cellValue);
               if (targetHeaders.includes(cellValue)) {
                  console.log("Found MATCH, checking next cell index:", i + 1)
                  const nextCell = row.c[i + 1];
                  const nextCellValue = getCellValue(nextCell, sharedStrings);
                  console.log("Adding rowData:", cellValue, nextCellValue)
                  console.log("---------------------------------------")
                  rowData[cellValue] = nextCellValue;
                  break; // Move to the next row after finding a match
               } else {
                  console.log("No Match\n------------------------------------")
                  break;
               }
            }
            if (Object.keys(rowData).length > 0) {
              extractedData.push(rowData);
            }
         });
      });
   });

   return {
      data: extractedData,
      errors
   };
}
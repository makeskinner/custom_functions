/**
 * This script is designed for a Make.com Code module.
 * It extracts all text values for a specific column ID from an array of Monday.com items.
 *
 * Required input variables:
 * - itemsArray: The array from mondayPayload.body.data.items.
 * - columnId: The string ID of the column to extract values from (e.g., "text_mkwkpb0d").
 */

// Main function to process the items array
function extractColumnValues(items, columnId) {
  // The 'items' parameter is now the array we need, so we can process it directly.
  return items
    // Use flatMap to get a single, flat array of all subitems from all parent items.
    .flatMap(item => item.subitems || [])
    // Use map to transform each subitem into the text value we want (or undefined).
    .map(subitem => {
      // Find the specific column within the subitem's column_values.
      const targetColumn = (subitem.column_values || []).find(
        col => col.id === columnId
      );
      // Safely return the 'text' property.
      return targetColumn?.text;
    })
    // Filter out any null or undefined results.
    .filter(Boolean);
}

// Testing input
let itemsArray = [
                    {
                        "subitems": [
                            {
                                "id": "5038904362",
                                "name": "Workshop: AI & Automation Day",
                                "column_values": [
                                    {
                                        "id": "text_mkwkpb0d",
                                        "text": "00Uck000000dA17EAE",
                                        "value": "\"00Uck000000dA17EAE\""
                                    }
                                ]
                            }
                        ]
                    }
                ];

// 2. Define the column ID you want to search for.
const columnId = "text_mkwkpb0d";

// --- Module Execution ---

// Retrieve input variables from the Make.com scenario
// const { itemsArray, columnId } = input;

// Logging to the Console for debugging
console.log("Processing items array for column ID: " + columnId);

// --- Input Validation ---
if (!Array.isArray(itemsArray)) {
  console.error("There was an error, the 'itemsArray' input was not a valid array.");
  throw new Error("Invalid 'itemsArray' provided. Please map the 'items' array directly from the Monday.com module.");
}

if (!columnId || typeof columnId !== 'string') {
  console.error("There was an error, the 'columnId' input was missing or not a string.");
  throw new Error("Invalid 'columnId' provided. Please provide the column ID as a string.");
}

// --- Process and Return Data ---

// Call the function with the provided inputs
const extractedValues = extractColumnValues(itemsArray, columnId);

// Logging the final output for debugging
console.log("Successfully extracted values:", extractedValues);
  
// Return the final array of values
return extractedValues;
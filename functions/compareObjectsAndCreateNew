function compareObjectsAndCreateNew(masterDataMatrix, bootsDataMatrices, headerRowIndex) {
    const output = [];
    const gtinKey = "Each - GTIN";

    // 1. Create a GTIN lookup table from masterDataMatrix.
    const masterDataMap = new Map();
    for (const masterItem of masterDataMatrix) {
        if (masterItem && masterItem[gtinKey]) {
            masterDataMap.set(masterItem[gtinKey], masterItem);
        }
    }

    // 2. Iterate through bootsDataMatrices entries.
    for (const bootDataEntry of bootsDataMatrices) {
        const { name, bootsDataMatrix, newDataWorkBookID } = bootDataEntry;

        if (!bootsDataMatrix || bootsDataMatrix.length === 0) {
            continue;
        }

        // 3. Iterate through items in the current bootsDataMatrix.
        for (let j = 0; j < bootsDataMatrix.length; j++) {
            const bootsItem = bootsDataMatrix[j];

            if (!bootsItem || !bootsItem[gtinKey]) {
                continue;
            }

            const gtinValue = bootsItem[gtinKey];
            const masterItem = masterDataMap.get(gtinValue);

            // 4. Check if a matching master item exists.
            if (masterItem) {
                // 5. Get the keys of the bootsItem.
                const bootsKeys = Object.keys(bootsItem);

                // 6. Iterate through the keys in the *bootsItem*.
                for (let i = 0; i < bootsKeys.length; i++) {
                    const key = bootsKeys[i];

                    if (key !== gtinKey && masterItem.hasOwnProperty(key)) {
                        // Dynamically determine columnIndex.
                        const columnIndex = i;

                        // Calculate the output rowIndex.
                        const outputRowIndex = headerRowIndex + j + 1;

                        // *** CRUCIAL CHANGE: Check for value difference ***
                        if (bootsItem[key] !== masterItem[key]) {
                            // 7. Create and push the output object ONLY if different.
                            output.push({
                                newDataWorkBookID,
                                name,
                                rowIndex: outputRowIndex,
                                columnIndex,
                                // value: masterItem[key], // Value to update TO (master), this simply overwrites the cell data
                                value: `${bootsItem[key]}; ${masterItem[key]}` // Concatenate the target file ('BootsMakeTest') value and the master ('New_Boots_Smartsheet_Data') value
                            });
                        }
                    }
                }
            }
        }
    }

    return output;
}
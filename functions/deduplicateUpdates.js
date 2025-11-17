function deduplicateUpdates(updatesArray) {
    // Helper function to normalize text for accurate comparison.
    // It removes all whitespace (spaces, newlines, tabs) and standardizes arrow characters.
    const normalizeText = (text) => {
        if (!text) return '';
        return text.replace(/\s/g, '').replace(/->/g, '→');
    };

    // This Map will store the normalized text of updates we've already seen.
    // The value will be the full object of the first unique update encountered.
    const seen = new Map();

    const duplicateIds = [];
    const duplicateObjects = [];

    // Loop through each update object in the input array.
    for (const update of updatesArray) {
        const normalized = normalizeText(update.text_body);

        // If we've already seen this normalized text, it's a duplicate.
        if (seen.has(normalized)) {
            duplicateIds.push(update.id);
            duplicateObjects.push(update);
        } else {
            // If it's the first time, mark it as seen. This becomes our "unique" version.
            seen.set(normalized, update);
        }
    }

    // The unique objects are the values we stored in our 'seen' Map.
    const uniqueObjects = Array.from(seen.values());

    // Return the final object with the three required arrays.
    return {
        duplicateIds,
        uniqueObjects,
        duplicateObjects
    };
}

const updatesArray = [
            {
                "id": "438017511",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437974752",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437935124",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437877446",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437860400",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437855080",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437852592",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437849904",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437848304",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***<br><br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\n\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437847104",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437845645",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437843840",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***<br><br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\n\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437840669",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437836246",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437831386",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***<br><br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\n\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437826658",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437820138",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437796261",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437779328",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437752645",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437738968",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***  <br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. → Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            },
            {
                "id": "437738930",
                "body": "*** Exec Summary ***<br><br>*** Tech Risks/Gaps ***<br><br>*** Next Step ***<br><br>LMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -&gt; Call Alex/Lars<br><br>*** ICP Category ***<br><br>*** NOTES ***",
                "text_body": "*** Exec Summary ***\n\n*** Tech Risks/Gaps ***\n\n*** Next Step ***\n\nLMU AUG13: Discover if opportunity is still in play given (soft?) compelling event has passed and contract with fresh 6 million ops has renewed. -> Call Alex/Lars\n\n*** ICP Category ***\n\n*** NOTES ***"
            }
        ];
// 1. The Mapping Dictionaries
const mappings = {
    products: {
        "Make": "make",
        "Make, Inc.": "make",
        "Make Enterprise": "make_enterprise",
        "AI/LLM": "ai_llm",
        "Workato": "make"
    },
    personas: {
        "IT": "it",
        "Ops": "ops",
        "RevOps": "revops",
        "Sales/SA": "revops",
        "Account Team": "revops",
        "People/HR": "revops",
        "Executive": "revops"
    },
    levels: {
        "IC": "ic",
        "Senior IC": "ic",
        "Manager": "manager",
        "Director+": "director_plus",
        "Director/Head": "director_plus",
        "Executive": "director_plus"
    },
    types: {
        "Discovery Call": "discovery_call",
        "Sales Strategy": "discovery_call",
        "Demo": "demo",
        "POC/Trial Support": "poc_support"
    }
};

// 2. Canonical Labels
const canonical_labels = {
    "make": "Make",
    "make_enterprise": "Make Enterprise",
    "ai_llm": "AI/LLM",
    "it": "IT",
    "ops": "Ops",
    "revops": "RevOps",
    "ic": "IC",
    "manager": "Manager",
    "director_plus": "Director+",
    "discovery_call": "Discovery Call",
    "demo": "Demo",
    "poc_support": "POC/Trial Support"
};

// 3. Inputs
var text = input.text || "";
var buttonRaw = input.button_value || "{}"; // New Input

// 4. Parse the Button JSON
var buttonIds = {};
try {
    // The button value is a stringified JSON (e.g., "{\"activity_id\":\"123\"}")
    // We parse it to get the object
    buttonIds = JSON.parse(buttonRaw);
} catch (e) {
    // If parse fails, return empty object to prevent crash
    buttonIds = {};
}

// 5. Helper Functions
function mapOptions(rawString, mapDict) {
    if (!rawString) return null;
    const seenValues = new Set();
    const options = rawString.split(',').map(item => {
        let label = item.trim();
        let value = mapDict[label] || null; 
        if (value && !seenValues.has(value)) {
            seenValues.add(value);
            let officialText = canonical_labels[value] || label;
            return {
                "text": { "type": "plain_text", "text": officialText },
                "value": value
            };
        }
        return null;
    }).filter(item => item !== null);
    return options.length > 0 ? options : null;
}

function mapSingleOption(rawString, mapDict) {
    let label = rawString ? rawString.trim() : "";
    let value = mapDict[label] || null;
    if (value) {
        let officialText = canonical_labels[value] || label;
        return {
            "text": { "type": "plain_text", "text": officialText },
            "value": value
        };
    }
    return null;
}

function safeJson(val) {
    return val ? JSON.stringify(val) : "null";
}

// 6. Regex Parsing
let subject = (text.match(/\*Subject:\*\s*(.*?)\n/) || [])[1] || "";
let productsRaw = (text.match(/\*Products Positioned:\*\s*(.*?)\n/) || [])[1] || "";
let functionsRaw = (text.match(/\*Persona Functions:\*\s*(.*?)\n/) || [])[1] || "";
let levelsRaw = (text.match(/\*Persona Levels:\*\s*(.*?)\n/) || [])[1] || "";
let typeRaw = (text.match(/\*SA Activity Type:\*\s*(.*?)\n/) || [])[1] || "";
let descRaw = (text.match(/\*Description:\*\s*([\s\S]*?)(?=Bouton Edit|$)/) || [])[1] || "";

// 7. Output
return {
    // Text Fields
    subject_json: JSON.stringify(subject.trim()), 
    description_json: JSON.stringify(descRaw.trim()),

    // Dropdown Fields
    type_option_json: safeJson(mapSingleOption(typeRaw, mappings.types)),
    products_options_json: safeJson(mapOptions(productsRaw, mappings.products)),
    functions_options_json: safeJson(mapOptions(functionsRaw, mappings.personas)),
    levels_options_json: safeJson(mapOptions(levelsRaw, mappings.levels)),
    
    // IDs & Links (The new data carrier)
    activity_id: buttonIds.activity_id || null,
    opportunity_id: buttonIds.opportunity_id || null,
    gong_link: buttonIds.gong_link || null,
    doc_link: buttonIds.doc_link || null
};
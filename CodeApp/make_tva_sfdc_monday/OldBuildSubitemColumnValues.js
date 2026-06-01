/**
 * BuildSubitemColumnValues.js
 *
 * Make Code Module — runs inside the subitem Iterator flow in Scenario 2,
 * after module 133 (Merge) and before the subitem create/update GraphQL modules.
 *
 * PURPOSE: Parses each Salesforce event from {{2.recentEvents[]}} and builds
 *          the column values JSON string for Monday subitem create/update mutations.
 *          Replaces modules 51 (listUsers) + 54 (ExecuteCode) from the old Scenario 4.
 *
 * INPUTS (declare in Make Code module UI):
 *   subject      → {{iterator.subject}}
 *   type         → {{iterator.type}}         (raw Activity_Type__c, e.g. "Workshop")
 *   start        → {{iterator.start}}
 *   end          → {{iterator.end}}
 *   location     → {{iterator.location}}
 *   sfId         → {{iterator.sfId}}
 *   delivered    → {{iterator.delivered}}    ("Yes" / "No" / "Open")
 *   contactName  → {{iterator.contactName}}
 *   contactEmail → {{iterator.contactEmail}}
 *   mondayUserId → {{var.team.markMonday}}
 *
 * OUTPUTS:
 *   itemName         → subitem name (the full event subject)
 *   columnValuesJson → JSON string for create_subitem / change_multiple_column_values
 *   sfId             → SF Event ID (used by List Subitems dedup search)
 *
 * SUBITEM COLUMN IDs (from board 2022888290 subitems):
 *   multiple_person_mkwkr3e1  Owner
 *   status                    Status
 *   color_mkwkd126            Type
 *   timerange_mkwkwnhn        Timeline
 *   numeric_mkwk8ypg          Duration (minutes)
 *   dropdown_mkwkf3za         Location
 *   email_mkwkt8d9            Contact Email
 *   text_mkwkpb0d             SF Event ID
 *   link_mkwkwqq8             Salesforce Link
 *   boolean_mkwkfgwp          Delivered
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const s  = (v) => (v === null || v === undefined) ? '' : String(v);
const dt = (isoStr) => (isoStr && isoStr.length >= 10) ? isoStr.split('T')[0] : null;

// ─── Inputs ─────────────────────────────────────────────────────────────────

const subject      = s(input.subject);
const rawType      = s(input.type);        // Activity_Type__c — coarse category
const start        = s(input.start);
const end          = s(input.end);
const location     = s(input.location);
const sfId         = s(input.sfId);
const delivered    = s(input.delivered);   // "Yes" | "No" | "Open"
const contactName  = s(input.contactName);
const contactEmail = s(input.contactEmail);
const mondayUserId = parseInt(s(input.mondayUserId), 10);

// ─── Workshop Type Matching ──────────────────────────────────────────────────
// Normalises free-text from the event subject into a predefined type label.

const WORKSHOP_NAMES = [
    'AI & Automation Day',
    'Use Case Discovery',
    'Operational Excellence',
    'Custom Apps',
    'Best Practices',
    'Optimization',
    'Custom On-Demand',
    'MSP Follow Up Workshop',
    'General Sync'
];

function findBestWorkshopMatch(text) {
    if (!text) return 'General Sync';
    const clean = text.trim().toLowerCase();
    const match = WORKSHOP_NAMES.find(name => {
        const n = name.toLowerCase();
        return clean.includes(n) || n.includes(clean);
    });
    return match || 'General Sync';
}

// ─── Subject Parsing ─────────────────────────────────────────────────────────
// Subject convention: "Company: Workshop Name > Status"
// e.g. "Acme: Use Case Discovery > Done"

let extractedType   = 'General Sync';
let extractedStatus = 'Planning';

if (subject.includes(':')) {
    // Everything after the first ":" and before any ">" is the workshop sub-type
    const afterColon = subject.split(':')[1];
    const rawSubtype = afterColon.split('>')[0].trim();
    extractedType = findBestWorkshopMatch(rawSubtype);
}

if (subject.includes('>')) {
    extractedStatus = subject.split('>')[1].trim();
} else if (delivered === 'Yes') {
    extractedStatus = 'Done';
}

// ─── Timeline & Duration ─────────────────────────────────────────────────────

let timeline = null;
let duration = null;

if (start && end) {
    const startMs = new Date(start);
    const endMs   = new Date(end);
    duration = Math.round((endMs - startMs) / 1000 / 60);
    timeline = { from: dt(start), to: dt(end) };
} else if (start) {
    // No end time — treat as single-day event
    timeline = { from: dt(start), to: dt(start) };
}

// ─── Column Values ───────────────────────────────────────────────────────────

const columnValues = {

    // Owner
    "multiple_person_mkwkr3e1": mondayUserId
        ? { personsAndTeams: [{ id: mondayUserId, kind: 'person' }] }
        : null,

    // Status (Planning / Done / In Progress / etc.)
    "status": { label: extractedStatus },

    // Type — normalised workshop/event name
    "color_mkwkd126": { label: extractedType },

    // Timeline
    "timerange_mkwkwnhn": timeline,

    // Duration in minutes
    "numeric_mkwk8ypg": duration,

    // Location — dropdown
    "dropdown_mkwkf3za": location
        ? { labels: [location] }
        : null,

    // Contact email
    "email_mkwkt8d9": (contactEmail || contactName)
        ? { email: contactEmail, text: contactName || contactEmail }
        : null,

    // SF Event ID — used for dedup
    "text_mkwkpb0d": sfId || null,

    // Link back to Salesforce event record
    "link_mkwkwqq8": sfId
        ? { url: `https://celonis.lightning.force.com/lightning/r/Event/${sfId}/view`, text: 'Open in Salesforce' }
        : null,

    // Delivered checkbox
    "boolean_mkwkfgwp": {
        checked: extractedStatus.toLowerCase() === 'done' ||
                 extractedStatus.toLowerCase() === 'completed' ||
                 delivered === 'Yes'
    }

};

// Strip nulls — Monday rejects null for several column types
const clean = Object.fromEntries(
    Object.entries(columnValues).filter(([, v]) => v !== null)
);

// ─── Output ──────────────────────────────────────────────────────────────────

return {
    itemName:         subject || 'Salesforce Event',
    columnValuesJson: JSON.stringify(clean),
    sfId:             sfId
};

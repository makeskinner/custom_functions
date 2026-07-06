// Build a map of org_id → comma-separated app list from Snowflake apps query.
// Runs after Snowflake apps query, feeds appsMap into veTracker.
//
// Input:  appRows — array of { ORG_ID, APP_ID } rows from Snowflake
// Output: appsMap — { 'm_12345': 'Slack, Google Sheets, Jira', ... }

function extractRows(input) {
    if (!input || !Array.isArray(input)) return [];
    if (input.length > 0 && input[0].rows) {
        return input.flatMap(b => b.rows || []);
    }
    return input;
}

const rows = extractRows(input.appRows);
const map = {};

rows.forEach(r => {
    const orgId = String(r.ORG_ID || r.org_id || '').trim();
    const appId = String(r.APP_ID || r.app_id || '').trim();
    if (!orgId || !appId || appId === 'null') return;
    if (!map[orgId]) map[orgId] = new Set();
    map[orgId].add(appId);
});

// Convert sets to sorted comma-separated strings
const appsMap = {};
Object.entries(map).forEach(([orgId, apps]) => {
    appsMap[orgId] = [...apps].sort().join(', ');
});

return { appsMap, orgCount: Object.keys(appsMap).length };

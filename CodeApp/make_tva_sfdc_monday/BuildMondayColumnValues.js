/**
 * BuildMondayColumnValues.js
 *
 * Make Code Module — runs in Scenario 2 after the AI Summarize / Sentiment modules
 * and BEFORE modules 142 (update) and 143 (create).
 *
 * PURPOSE: Single source of truth for every Monday column mapping.
 *          Replaces the per-column UI configuration in ChangeMultipleColumnValues
 *          and CreateItem with one maintainable JSON string.
 *
 * INPUTS (pass from Make mapper):
 *   All {{2.*}} fields from the webhook bundle, plus:
 *   - sentiment    → {{capitalize(74.sentiment)}}
 *   - mondayUserId → {{var.team.markMonday}}
 *
 * OUTPUTS:
 *   - columnValuesJson  → JSON string for change_multiple_column_values / create_item
 *   - itemName          → {{2.oppName}}  (for create_item mutation)
 *   - boardId           → hardcoded
 *   - groupId           → hardcoded
 *
 * EXCLUDED COLUMNS (set by Scenario 3 — do not overwrite here):
 *   color_mm2t6tme   AI Risk Suggestion
 *   dropdown_mm2v5s62  Business Functions
 *   date_mm2ke3w2    Latest Strategy
 *   numeric_mm2kk8ch #Strategies
 *
 * READ-ONLY / AUTO COLUMNS (never writable via API):
 *   lookup_mksewh5b  Event Status (mirror)
 *   formula_mm2kn548 ORG_ID_Text (formula)
 *   pulse_id_mkwjf4pk  Item ID
 *   pulse_updated_mm2qmwe4  Last updated
 *   button_mm2k7db5  GTM Strategist (button)
 *   numbers2         Duration (unmapped — not yet sourced)
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Safe string — returns null if blank/null/undefined */
const s = (v) => (v === null || v === undefined || v === '') ? null : String(v);

/** Safe number — returns null if not a valid finite number */
const n = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const num = Number(v);
    return isFinite(num) ? num : null;
};

/** Safe date — ensures YYYY-MM-DD format, returns null otherwise */
const dt = (v) => {
    if (!v) return null;
    const d = String(v).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

// ─── Input ──────────────────────────────────────────────────────────────────

const d = JSON.parse(input.data); // Parses {{2.mondayDataJson}} — pre-packaged JSON string from OldMarkTaskTracker.js
d.sentiment    = input.sentiment;    // {{capitalize(74.sentiment)}}
d.mondayUserId = input.mondayUserId; // {{var.team.markMonday}}

// ─── Column Value Map ────────────────────────────────────────────────────────

const columnValues = {

    // ── IDENTIFIERS ─────────────────────────────────────────────────────────
    "text_mksrb9zr":    s(d.oppId),                             // Unique ID
    "text_mkx8vg4t":    s(d.accountId),                         // Account ID
    "text_mkx8rycj":    s(d.orgIdRaw),                          // Make Org ID
    "text_mkx8jsaf":    s(d.orgZone),                           // Zone Name
    "text_mks9d4jw":    s(d.companyName),                       // Company
    "text_mm2yxm9x":    s(d.companySize),                       // Company Size
    "country_mm2y6wbq": d.billingCountryCode
                            ? { countryCode: s(d.billingCountryCode), countryName: s(d.billingCountry) }
                            : null,                              // Country
    "text_mm3qegz":     s(d.makeMarket),                        // Make Market

    // ── TEAM & OWNERSHIP ────────────────────────────────────────────────────
    "text_mkszjby6":          s(d.integromatOwner),             // Account Manager
    "text_mkwmyyk4":          s(d.leadVE),                      // Lead VE
    "text_mm30hcav":          s(d.leadVEManager),               // VE Manager
    "multiple_person_mksdjrzz": d.mondayUserId
                            ? { personsAndTeams: [{ id: parseInt(d.mondayUserId, 10), kind: "person" }] }
                            : null,                              // Assigned
    "boolean_mm3ja70a":      d.notOnOppTeamFlag
                            ? { checked: "true" }
                            : { checked: "false" },              // Not on Oppy

    // ── COMMERCIAL ──────────────────────────────────────────────────────────
    "color_mksnf97k":    { label: s(d.oppType) },               // Type
    "color_mksr1ck2":    { label: s(d.stageNameStatus) },       // Stage
    "color_mm2yfps9":    { label: s(d.calculatedPriority) },    // Priority
    "color_mm39pae0":    { label: s(d.expansionLevel) },        // Expansion Level
    "numeric_mkspwvfs":  n(d.amountConvertedUSD),               // Exp Revenue
    "numeric_mm2yvy3g":  n(d.totalARR),                         // Total ARR
    "numeric_mkx8hjh2":  n(d.sumRenewalAmount),                 // Renewal Amount
    "numeric_mkx82s4c":  n(d.contractDuration),                 // Contract Duration
    "numeric_mkwkrgz":   n(d.expansionScoreRollUp),             // Expansion Score
    "project_timeline":  (d.projectTimelineFrom && d.projectTimelineTo)
                            ? { from: s(d.projectTimelineFrom), to: s(d.projectTimelineTo) }
                            : null,                              // Timeline
    "date_mm2ymsw1":     dt(d.nextRenewalDate)
                            ? { date: dt(d.nextRenewalDate) }
                            : null,                              // Next Renewal

    // ── CHURN ───────────────────────────────────────────────────────────────
    "color_mkwpdfh2":    { label: s(d.churnRiskStatus) },       // Churn Risk
    "numeric_mkwpyzqw":  n(d.churnValue),                       // Churn Value

    // ── AI SIGNALS ──────────────────────────────────────────────────────────
    "status_1":          { label: s(d.urgencyLevel) },          // Urgency  (JS-computed)
    "color_mks95kw8":    { label: s(d.sentiment) },             // Sentiment (module 74)

    // ── LINKS ───────────────────────────────────────────────────────────────
    "link_mks9axms":  { url: s(d.sfOppUrl),          text: s(d.sfOppLinkText) },        // Opportunity Link
    "link_mkx81jd5":  { url: s(d.freshdeskUrl),      text: s(d.freshdeskLinkText) },    // Freshdesk
    "link_mkx8wq4b":  { url: s(d.sigmaUrl),          text: s(d.sigmaLinkText) },        // Health Dashboard
    "link_mm35nafe":  { url: s(d.makeDashboardUrl),  text: s(d.makeDashboardLinkText) },// Make Admin UI

    // ── TOP USER ────────────────────────────────────────────────────────────
    "email_mm32a9gx": { email: s(d.topUserEmail), text: s(d.topUserName) },             // Top User

    // ── ORG CAPACITY ────────────────────────────────────────────────────────
    "numeric_mkx8dfb1":  n(d.opsInPlan),                        // Ops in Plan
    "numeric_mkx8h6qt":  n(d.opsLeftInPlan),                    // Ops Left in Plan
    "numeric_mkx8f5ps":  n(d.opsLeftInPlanWithExtra),           // Ops Left in Plan with Extras
    "numeric_mkx8d2ec":  n(d.extraOpsInPlan),                   // Extra Ops in Plan
    "numeric_mm2qs62h":  n(d.expConsumption),                   // Exp. Consumption %

    // ── USAGE: SCENARIOS ────────────────────────────────────────────────────
    "numeric_mkx8wm8k":  n(d.activeScenariosCurrMonth),         // Active Scenarios Current Month
    "numeric_mkx8srm3":  n(d.activeScenariosPrevMonth),         // Active Scenarios Previous Month
    "numeric_mm2q8r36":  n(d.trendActiveScenarios),             // Trend [Monthly Active Scenarios]

    // ── USAGE: TEAMS ────────────────────────────────────────────────────────
    "numeric_mkx87p2m":  n(d.nbTeamsCurrMonth),                 // Teams Current Month
    "numeric_mkx8d0sw":  n(d.nbTeamsPrevMonth),                 // Teams Previous Month
    "numeric_mm2qdv6w":  n(d.trendNbTeams),                     // Trend [Monthly Teams]

    // ── USAGE: USERS ────────────────────────────────────────────────────────
    "numeric_mkx8bwts":  n(d.nbUsersCurrMonth),                 // Users Current Month
    "numeric_mkx8tnfh":  n(d.nbUsersPrevMonth),                 // Users Previous Month
    "numeric_mm38vnyg":  n(d.nbUsersActive),                    // Active Users Current Month
    "numeric_mm2qbsrv":  n(d.trendNbUsers),                     // Trend [Monthly Users]

    // ── USAGE: CONSUMPTION ──────────────────────────────────────────────────
    "numeric_mkx8gdap":  n(d.opsConsumedCurrMonth),             // Credits Consumed Current Month
    "numeric_mkx8wave":  n(d.opsConsumedPrevMonth),             // Credits Consumed Previous Month
    "numeric_mm2qe797":  n(d.trendOpsConsumed),                 // Trend [Monthly Consumption]

    // ── APPS ────────────────────────────────────────────────────────────────
    "long_text_mm2qc62g": { text: s(d.listOfAppsUsed) },        // Apps Used

    // ── HEALTH & SUPPORT ────────────────────────────────────────────────────
    "numeric_mkx8kw40":  n(d.csatAverage),                      // CSAT Avg
    "numeric_mkx864g8":  n(d.csatCount),                        // CSAT Count
    "numeric_mkx8c8w7":  n(d.healthScoreAverage),               // Health Score Avg
    "numeric_mkx8hnnx":  n(d.healthScoreCount),                 // Health Score Count
    "numeric_mkx8a31v":  n(d.npsAverage),                       // NPS Avg
    "numeric_mkx8ng3z":  n(d.npsCount),                         // NPS Count
    "numeric_mkx84chj":  n(d.nbOfOpenTickets),                  // Open Tickets
    "numeric_mkx8v4cj":  n(d.nbOfTickets),                      // Total Tickets
    "numeric_mm2q85mb":  n(d.usageScore),                       // Usage Score

    // ── EVENTS & ENGAGEMENT ─────────────────────────────────────────────────
    "numeric_mm2yz2xz":  n(d.totalEngagementsL2M),          // Total Engagements L2M    (Meetings L1M + Workshops L2M)
    "numeric_mm3cmf65":  n(d.pastMeetingsL12M),              // Meetings Delivered L12M
    "numeric_mm3q30kh":  n(d.pastMeetingsL30D),              // Meetings Delivered L1M
    "numeric_mm2ypsn3":  n(d.upcomingMeetingsCount),         // Meetings Scheduled N1M
    "numeric_mm2ybg8d":  n(d.workshopsDeliveredCount),       // Workshops Delivered L2M
    "numeric_mm3ct96m":  n(d.workshopsPlannedNext2M),        // Workshops Scheduled N2M
    "numeric_mm3q5z4g":  n(d.workshopsPlannedCount),         // Total Workshops Scheduled

};

// ─── Strip nulls ─────────────────────────────────────────────────────────────
// Monday rejects null for certain column types; omitting the key is always safe.
const cleanColumnValues = Object.fromEntries(
    Object.entries(columnValues).filter(([, v]) => v !== null)
);

// ─── Output ──────────────────────────────────────────────────────────────────
return {
    columnValuesJson: JSON.stringify(cleanColumnValues),
    itemName:         s(d.oppName),          // used by create_item mutation
    boardId:          "2022888290",
    groupId:          "group_mkspjbyp"       // "Salesforce Opportunities" group
};

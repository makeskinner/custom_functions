const accountData = input.inputData;

// --- STEP 1: BULLETPROOF SNOWFLAKE EXTRACTION ---
// Handles both flat array and nested .rows formats
function extractSnowflakeData(inputArray) {
    if (!inputArray || !Array.isArray(inputArray) || inputArray.length === 0) return [];
    if (inputArray[0].rows && Array.isArray(inputArray[0].rows)) return inputArray[0].rows;
    return inputArray;
}

// Index all Snowflake data by org ID so multi-account runs get the right data per account
const allSnowflakeTeams = extractSnowflakeData(input.snowflakeTeams);
const allSnowflakeUsers = extractSnowflakeData(input.snowflakeUsers);

const snowflakeTeamsByOrg = {};
allSnowflakeTeams.forEach(t => {
    const id = String(t.ORG_ID || t.org_id || '').replace(/^m_/, '');
    if (!snowflakeTeamsByOrg[id]) snowflakeTeamsByOrg[id] = [];
    snowflakeTeamsByOrg[id].push(t);
});

const snowflakeUsersByOrg = {};
allSnowflakeUsers.forEach(u => {
    const id = String(u.ORG_ID || u.org_id || '').replace(/^m_/, '');
    if (!snowflakeUsersByOrg[id]) snowflakeUsersByOrg[id] = [];
    snowflakeUsersByOrg[id].push(u);
});

/**
 * Calculates Management Priority based on Renewal (H1/H2), Consumption, and Score.
 * Updated for Make.com FY27 Framework (Feb 1, 2026 - Jan 31, 2027).
 */
function calculateManagementPriority(renewalDateStr, expConsumption, expScore) {
    if (!renewalDateStr) return "None";

    const renewalDate = new Date(renewalDateStr);
    
    // Define Fiscal Year Boundaries for FY27
    const fyStart = new Date('2026-02-01');
    const h2Start = new Date('2026-08-01'); // H1 ends Jul 31; H2 starts Aug 1
    const fyEnd   = new Date('2027-02-01'); // Next FY starts Feb 1, 2027

    // Check if the renewal falls within the current fiscal year
    const isRenewingThisYear = (renewalDate >= fyStart && renewalDate < fyEnd);
    
    // Check if the renewal falls strictly within H1 of this fiscal year
    const isH1 = (renewalDate >= fyStart && renewalDate < h2Start);

    if (isRenewingThisYear) {
        if (isH1 && expConsumption > 80) return "Priority 1";
        if (!isH1 && expConsumption > 80) return "Priority 2";
        if (expScore >= 0.5) return "Priority 3";
    } else {
        // Accounts NOT renewing this fiscal year
        if (expConsumption > 80) return "Priority 4";
        if (expScore >= 0.4) return "Priority 5";
    }

    return "None";
}

/**
 * Computes Urgency level and a plain-English reason from hard business signals.
 * Eliminates the need for an AI categorisation call in Scenario 2.
 *
 * Priority order of signals:
 *   1. Opportunity type  (Manual Renewal / Expand are highest-stakes)
 *   2. Management priority  (renewal window + consumption)
 *   3. Churn risk  (explicit SFDC flag)
 */
function calculateUrgency(oppType, priority, churnRisk) {
    const isTopPriority = (priority === 'Priority 1' || priority === 'Priority 2');
    const isHighChurn   = (churnRisk === 'HIGH' || churnRisk === 'CRITICAL');

    if (oppType === 'Manual Renewal') {
        if (isTopPriority || isHighChurn) {
            return {
                level: 'Critical',
                details: `Manual renewal with ${priority || 'elevated'} priority${isHighChurn ? ` and ${churnRisk} churn risk` : ''}. Customer must actively choose to stay — immediate action required.`
            };
        }
        return {
            level: 'High',
            details: 'Manual renewal requires proactive engagement to secure contract continuation.'
        };
    }

    if (oppType === 'Expand') {
        if (isTopPriority) {
            return {
                level: 'Critical',
                details: `Expansion opportunity with ${priority}. High-value account — prioritise stakeholder alignment now.`
            };
        }
        return {
            level: 'High',
            details: 'Active expansion opportunity. Drive use case depth and cross-team adoption.'
        };
    }

    if (oppType === 'Auto-Renewal') {
        if (isHighChurn) {
            return {
                level: 'High',
                details: `Auto-renewal at risk — ${churnRisk} churn signal detected. Intervention required before renewal date.`
            };
        }
        if (isTopPriority) {
            return {
                level: 'Medium',
                details: `Auto-renewal with ${priority}. Monitor health metrics and usage trend closely.`
            };
        }
        return { level: 'Low', details: 'Auto-renewal on track. Standard health monitoring applies.' };
    }

    if (oppType === 'Land') {
        if (isTopPriority) {
            return {
                level: 'High',
                details: `New business opportunity with ${priority}. Accelerate technical validation and champion building.`
            };
        }
        return { level: 'Medium', details: 'New business opportunity in active development.' };
    }

    return { level: 'Medium', details: 'Standard account monitoring applies.' };
}

/**
 * Determines the Expansion Framework Level based on ACV/ARR and User Count
 * Level 1: $10K+ ACV OR 5+ Active Users (Tipping Point)
 * Level 2: $25K+ ACV
 * Level 3: $100K+ ACV
 */
function calculateExpansionLevel(arr, activeUsers) {
    if (arr >= 100000) return "Level 3";
    if (arr >= 25000) return "Level 2";
    if (arr >= 10000 || activeUsers >= 5) return "Level 1";
    return "Seed / Prospect";
}

function transformOpportunities(accountsArray) {
  if (!Array.isArray(accountsArray) || accountsArray.length === 0) return [];

  const transformedItems = [];
  const get = (obj, path, defaultValue = null) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return (value !== undefined && value !== null) ? value : defaultValue;
  };

  const calcTrend = (curr, prev) => (curr || 0) - (prev || 0);
  const getVal = (obj, key) => obj[key.toLowerCase()] || obj[key.toUpperCase()] || 0;
  const getString = (obj, key) => obj[key.toLowerCase()] || obj[key.toUpperCase()] || "";

  for (const rawItem of accountsArray) {
    // Safely extract the account details whether it ran via the limited or full SOQL module
    const account = rawItem.SalesforceBundle ? rawItem.SalesforceBundle : rawItem;

  const oppRecords = get(account, 'Opportunities.records', []);
    if (oppRecords.length === 0) {
        // Account has no qualifying opps in the subquery — skip silently
        continue;
    }

    const companyName = get(account, 'Name');

    // --- STEP 2: INDEX LIFECYCLE RECORDS BY ACCOUNT ID ---
// When lifecycleRecords is provided as a separate input (separate SFDC query
// after pagination), use that. Otherwise fall back to the subquery records
// embedded in the account (legacy path, kept for backward compatibility).
const lifecyclesByAccount = {};
if (Array.isArray(input.lifecycleRecords) && input.lifecycleRecords.length > 0) {
    input.lifecycleRecords.forEach(lc => {
        const acctId = lc.Account__c;
        if (!acctId) return;
        if (!lifecyclesByAccount[acctId]) lifecyclesByAccount[acctId] = [];
        lifecyclesByAccount[acctId].push(lc);
    });
}
    // --- SELECT PRIMARY ORG (account-level, shared across all opps) ---
    // Use the separate lifecycle records input if available (preferred),
    // otherwise fall back to the embedded Make_LifeCycles__r subquery.
    const accountId   = get(account, 'Id');
    const lcFromInput = lifecyclesByAccount[accountId];
    const lifeCycles  = lcFromInput
        ? [...lcFromInput].sort((a, b) => {
            // 1. MMS deal type org always first (it's the account's primary org)
            const aIsMMS = a.Deal_Type__c === 'MMS' ? 0 : 1;
            const bIsMMS = b.Deal_Type__c === 'MMS' ? 0 : 1;
            if (aIsMMS !== bIsMMS) return aIsMMS - bIsMMS;
            // 2. Parent orgs (Parent_Org__c = null) before child orgs
            const aIsParent = !a.Parent_Org__c ? 0 : 1;
            const bIsParent = !b.Parent_Org__c ? 0 : 1;
            if (aIsParent !== bIsParent) return aIsParent - bIsParent;
            // 3. Highest usage score wins
            return (b.imt_Usage_Score__c || 0) - (a.imt_Usage_Score__c || 0);
          })
        : get(account, 'Make_LifeCycles__r.records', []);
    const primaryOrg = lifeCycles[0] || {};
    const orgIdRaw = get(primaryOrg, 'imt_Make_OrgId__c');
    const isLead   = !orgIdRaw;
    const sigmaId  = orgIdRaw ? `m_${orgIdRaw}` : "N/A";
    const dealType = get(primaryOrg, 'Deal_Type__c', null);
    const isMMS    = dealType === 'MMS';

    // For MMS accounts, sum Org_Ops_Consumption_from_License__c across ALL orgs
    // (parent + child) since consumption is distributed across the shared license
    const mmsTotalOpsConsumed = isMMS && lcFromInput
        ? lcFromInput.reduce((sum, lc) => sum + (lc.Org_Ops_Consumption_from_License__c || 0), 0)
        : null;

    // Pre-compute MMS consumption % here, alongside mmsTotalOpsConsumed, while isMMS is certain
    const mmsExpConsumptionPct = isMMS && mmsTotalOpsConsumed > 0
        ? (() => {
            const plan = get(primaryOrg, 'Contract_Ops_In_Plan__c', 0)
                      || get(primaryOrg, 'imt_Org_Ops_In_Plan__c', 0);
            return plan > 0 ? Math.round((mmsTotalOpsConsumed / plan) * 100) : 0;
          })()
        : null;

    // --- ZONE & DASHBOARD URL (account-level) ---
    const zoneNameRaw = get(primaryOrg, 'imt_Org_Zone_Name__c', 'us1');
    const lowerZone = zoneNameRaw.toLowerCase();
    const zoneUrlPart = lowerZone.startsWith('ent_')
        ? lowerZone.replace('ent_', '') + '.make.celonis.com'
        : lowerZone + '.make.com';
    const orgDashboardUrl = `https://${zoneUrlPart}/admin/organization/${orgIdRaw}/dashboard`;

    // --- MAKE MARKET (account-level — derived from BillingCountryCode) ---
    // Uses ISO country codes for reliable matching; falls back to BillingCountry string.
    // Mirrors the market list previously used in the AI prompt for this field.
    const billingCountryCode = (get(account, 'BillingCountryCode') || '').toUpperCase().trim();
    const billingCountryName = (get(account, 'BillingCountry') || '').toLowerCase().trim();

    function deriveMakeMarket(code, name) {
        // USA + Canada
        if (code === 'US' || code === 'CA') return 'USA (including CA)';
        // Named single-country markets
        if (code === 'DE') return 'Germany';
        if (code === 'FR') return 'France';
        if (code === 'GB') return 'UK';
        if (code === 'BR') return 'Brazil';
        if (code === 'ES') return 'Spain';
        if (code === 'IL') return 'Israel';
        // Spanish-speaking LATAM (excludes Brazil)
        const spanishLatam = ['AR','BO','CL','CO','CR','CU','DO','EC','GT','HN','MX','NI','PA','PE','PR','PY','SV','UY','VE'];
        if (spanishLatam.includes(code)) return 'Spanish-speaking LATAM';
        // Fallback: country name string matching for misconfigured orgs missing ISO code
        if (name.includes('united states') || name.includes('canada')) return 'USA (including CA)';
        if (name.includes('germany') || name.includes('deutschland')) return 'Germany';
        if (name.includes('france')) return 'France';
        if (name.includes('united kingdom') || name === 'uk' || name === 'england') return 'UK';
        if (name.includes('brazil') || name.includes('brasil')) return 'Brazil';
        if (name === 'spain' || name.includes('españa')) return 'Spain';
        if (name.includes('israel')) return 'Israel';
        return 'Other';
    }

    const makeMarket = deriveMakeMarket(billingCountryCode, billingCountryName);

    // --- PHASE 2: CONSOLIDATED EVENT ENGINE (account-level — processed once) ---
    // Filter events to those owned by the Lead VE for this account
    // (SOQL can't do cross-object field references in subquery WHERE, so we filter here)
    const leadVEName = get(account, 'imt_Make_Lead_VE__r.Name', '');
    const allEventRecords = get(account, 'Events.records', []);
    const eventRecords = leadVEName
        ? allEventRecords.filter(e => {
              const ownerName = get(e, 'Owner.Name') || get(e, 'OwnerId') || '';
              return ownerName === leadVEName;
          })
        : allEventRecords;
    const now = new Date();
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(now.getDate() - 60);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
    const twelveMonthsAgo = new Date(); twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
    const twoMonthsAgo = new Date(); twoMonthsAgo.setMonth(now.getMonth() - 2);
    const twoMonthsFromNow = new Date(); twoMonthsFromNow.setMonth(now.getMonth() + 2);

    let pastMeetingsL60D = 0,
        pastMeetingsL30D = 0,
        pastMeetingsL12M = 0,
        upcomingMeetings = 0,
        workshopsDelivered = 0,
        workshopsPlanned = 0,
        workshopsPlannedNext2M = 0;

    const formattedEvents = eventRecords.map(event => {
        const eDateStr = get(event, 'Activity_Date__c');
        const eType = get(event, 'Activity_Type__c', '');
        const eDelivered = get(event, 'Delivered__c', 'No');
        const eventDate = eDateStr ? new Date(eDateStr) : null;

        if (eventDate) {
            if (eType.includes("Workshop")) {
            const isRejected = get(event, 'Approval_Status__c') === 'Rejected';
            if (!isRejected && eDelivered === "Yes" && eventDate >= twoMonthsAgo) workshopsDelivered++;
            if (!isRejected && eDelivered === "Open" && eventDate >= now) workshopsPlanned++;
            if (!isRejected && eDelivered === "Open" && eventDate >= now && eventDate <= twoMonthsFromNow) workshopsPlannedNext2M++;
        } else if (eType.includes("Meeting")) {
                if (eventDate >= sixtyDaysAgo && eventDate < now) pastMeetingsL60D++;
                if (eventDate >= thirtyDaysAgo && eventDate < now) pastMeetingsL30D++;
                if (eventDate >= twelveMonthsAgo && eventDate < now) pastMeetingsL12M++;
                if (eventDate >= now) upcomingMeetings++;
            }
        }
        return {
            sfId:               get(event, 'Id'),
            subject:            get(event, 'Subject'),
            type:               eType,
            status:             eDelivered,
            date:               eDateStr,
            start:              get(event, 'StartDateTime') || eDateStr,
            end:                get(event, 'EndDateTime') || get(event, 'Activity_Date__c'),
            location:           get(event, 'Location'),
            delivered:          eDelivered,
            deliveredDate:      get(event, 'Delivered_Date__c'),
            contactName:        get(event, 'Who.Name'),
            contactEmail:       get(event, 'Who.Email'),
            approvalStatus:     get(event, 'Approval_Status__c'),
            rejectionCount:     get(event, 'Rejection_Count__c'),
            rejectedComments:   get(event, 'Rejected_Comments__c')
        };
    });

    // --- PHASE 3: SNOWFLAKE SYNTHESIS (account-level, per-org lookup) ---
    const sfTeams = snowflakeTeamsByOrg[String(orgIdRaw)] || [];
    const sfUsers = snowflakeUsersByOrg[String(orgIdRaw)] || [];
    let totalL = 0, total2 = 0;
    const teamSummaryForAgent = isLead ? [] : sfTeams.map(t => {
        const cL = getVal(t, 'CREDITS_LAST_MONTH'), c2 = getVal(t, 'CREDITS_2_MONTHS_AGO');
        totalL += cL; total2 += c2;
        return {
            t:  getString(t, 'TEAM_NAME'),
            c:  cL,
            tr: (c2 > 0) ? Math.round(((cL - c2) / c2) * 100) : 0,
            bf: getString(t, 'BUSINESS_FUNCTION') || null
        };
    }).filter(t => t.c > 0);

    // Derive distinct active business functions from team data
    const activeFunctions = isLead ? '' : [...new Set(
        teamSummaryForAgent
            .map(t => t.bf)
            .filter(bf => bf && bf.trim() !== '')
    )].join(', ');

    const powerUserSummaryForAgent = isLead ? "No active usage" : sfUsers.slice(0, 3).map(u => {
        return `${getString(u, 'USER_NAME') || 'Unknown'} (${getString(u, 'USER_JOB_ROLE') || 'No Role'}): ${getVal(u, 'CREDITS_LAST_MONTH')} credits. Exp: ${getString(u, 'USER_AUTOMATION_EXPERIENCE') || 'Unknown'}`;
    }).join(' | ');

    const overallTrend = total2 > 0 ? Math.round(((totalL - total2) / total2) * 100) : 0;

    const priorityVal = calculateManagementPriority(
        get(account, 'Next_Renewal_Date__c'),
        get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0),
        get(account, 'Make_Expansion_Score_RollUp__c', 0)
    );

    const nbUsersActive = get(primaryOrg, 'imt_Org_Nb_Active_Users_Curr_Month__c', 0);
    const nbUsersTotal  = get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c', 0);
    const currentARR    = get(account, 'Integromat_ARR_USD__c', 0);
    const expansionLevel = calculateExpansionLevel(currentARR, nbUsersActive);

    // --- SORT OPPORTUNITIES: Expand → Manual Renewal → Auto-Renewal → Land ---
    // Events and engagement metrics are attached only to the highest-priority opp (index 0).
    const oppTypeSortKey = (o) => {
        const rt   = get(o, 'RecordType.Name', '');
        const rtId = get(o, 'RecordTypeId', '');
        const name = get(o, 'Name', '');
        if (rt.includes('O04') || rtId === '01207000000bpeJAAQ') return 1; // Expand
        if ((rt.includes('O02') || rtId === '0121v000000aUhnAAE') && !name.includes('Auto Renewal')) return 2; // Manual Renewal
        if ((rt.includes('O02') || rtId === '0121v000000aUhnAAE') &&  name.includes('Auto Renewal')) return 3; // Auto-Renewal
        return 4;
    };
    oppRecords.sort((a, b) => oppTypeSortKey(a) - oppTypeSortKey(b));

    // --- LOOP OVER ALL OPPORTUNITIES (one Monday item per opp) ---
    for (let oppIdx = 0; oppIdx < oppRecords.length; oppIdx++) {
    const opp = oppRecords[oppIdx];
    const oppId = get(opp, 'Id');
    const isTopOpp = oppIdx === 0; // only the highest-priority opp carries events

    // --- DYNAMIC OPPORTUNITY CLASSIFICATION ENGINE ---
    const oppNameRaw = get(opp, 'Name', '');
    const recordTypeName = get(opp, 'RecordType.Name', '');
    let preciseOppType = 'Expand';

    if (isLead) {
        preciseOppType = 'Land';
    } else if (recordTypeName.includes('O02') || get(opp, 'RecordTypeId') === '0121v000000aUhnAAE') {
        preciseOppType = oppNameRaw.includes('Auto Renewal') ? 'Auto-Renewal' : 'Manual Renewal';
    } else if (recordTypeName.includes('O04') || get(opp, 'RecordTypeId') === '01207000000bpeJAAQ') {
        preciseOppType = 'Expand';
    }

    // Urgency is per-opp (depends on opp type and churn risk)
    const urgency = calculateUrgency(preciseOppType, priorityVal, get(opp, 'imt_Churn_Risk__c'));

    // --- PHASE 4: ENRICHED AI STRATEGIST PAYLOAD ---
    const agentPayload = {
        acc:  { id: get(account, 'Id'), n: companyName, arr: currentARR, pr: priorityVal, level: expansionLevel },
        comm: {
            st:      get(opp, 'StageName') || "Unknown Stage",
            type:    preciseOppType,
            risk:    get(opp, 'imt_Churn_Risk__c') || "NOT AT RISK",
            urgency: urgency.level,
            renewal: get(account, 'Next_Renewal_Date__c'),
            sum:     get(opp, 'Executive_Summary__c') ? get(opp, 'Executive_Summary__c').substring(0, 500) : "[MISSING_EXECUTIVE_SUMMARY]",
            notes:   get(opp, 'imt_Notes__c') ? get(opp, 'imt_Notes__c').substring(0, 400) : "[MISSING_TECHNICAL_NOTES]",
            next:    get(opp, 'Next_Step__c') ? get(opp, 'Next_Step__c').substring(0, 300) : "[MISSING_NEXT_STEPS]"
        },
        tech: { apps: (get(primaryOrg, 'List_of_Apps_Used__c') || "None Listed"), isLead: isLead },
        ve:   { p: pastMeetingsL60D, d: workshopsDelivered, events: isTopOpp ? formattedEvents : [] },
        snk:  { trend: overallTrend, credits: totalL, consumption: get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0), teams: teamSummaryForAgent, users: powerUserSummaryForAgent, functions: activeFunctions },
        users: { active: nbUsersActive, total: nbUsersTotal, gap: (nbUsersTotal - nbUsersActive) }
    };

    // --- PHASE 5: EXHAUSTIVE UNIFIED MONDAY MAPPING ---
    transformedItems.push({
        // BLOCK 1: CORE IDENTIFIERS
        oppName: get(opp, 'Name'), 
        oppId: oppId, 
        accountId: get(account, 'Id'), 
        lifecycleSfId: get(primaryOrg, 'Id'),
        companyName: companyName,
        expansionScoreRollUp: get(account, 'Make_Expansion_Score_RollUp__c', 0), 
        
        // BLOCK 2: TEAM & OWNERSHIP
        integromatOwner: get(account, 'Integromat_Owner__r.Name'), 
        leadVE: get(account, 'imt_Make_Lead_VE__r.Name'), 
        leadVEManager: get(account, 'imt_Make_Lead_VE__r.Manager.Name'), 
        bdrOwner: get(account, 'imt_Make_BDR__r.Name'),

        // BLOCK 3: LINKS
        sfOppUrl: get(opp, 'Opportunity_Link__c'),
        sfOppLinkText: oppId,
        freshdeskUrl: get(primaryOrg, 'imt_FDESK_Company_URL__c') || "https://make-hq.freshdesk.com/a/companies/",
        freshdeskLinkText: companyName,
        sigmaUrl: `https://app.sigmacomputing.com/make/workbook/Customer-Insights-2xZI2ksPDfzGkveIgKqDCA?Org-Id-Input=${sigmaId}`,
        sigmaLinkText: sigmaId,
        makeDashboardUrl: orgDashboardUrl, 
        makeDashboardLinkText: `${zoneNameRaw} (${orgIdRaw || "Lead"})`,

        // BLOCK 4: ORG CAPACITY & PLAN
        orgIdRaw: orgIdRaw || "LEAD_NO_ORG",
        orgZone: zoneNameRaw,
        orgName: get(primaryOrg, 'imt_Org_Name__c', null),
        orgPlan: get(primaryOrg, 'imt_Org_Plan__c', "Prospect"),
        opsInPlan: get(primaryOrg, 'imt_Org_Ops_In_Plan__c', 0),
        extraOpsInPlan: get(primaryOrg, 'imt_Org_Extra_Ops_In_Plan__c', 0),
        opsLeftInPlan: get(primaryOrg, 'imt_Org_Ops_Left_In_Plan__c', 0),
        opsLeftInPlanWithExtra: get(primaryOrg, 'imt_Org_Ops_Left_In_Plan_w_Extra__c', 0),
        expConsumption: mmsExpConsumptionPct !== null
            ? mmsExpConsumptionPct
            : get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0),
        listOfAppsUsed: get(primaryOrg, 'List_of_Apps_Used__c', null) || null,

        // BLOCK 5: USAGE TRENDS
        trendActiveScenarios: calcTrend(get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c'), get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c')),
        trendNbUsers: calcTrend(get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c'), get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c')),
        trendOpsConsumed: calcTrend(get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c'), get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c')),
        trendNbTeams: calcTrend(get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c'), get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c')),

        // BLOCK 6: RAW USAGE
        activeScenariosCurrMonth: get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c', 0),
        activeScenariosPrevMonth: get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c', 0),
        // For MMS accounts, ops are consumed against the license rather than
        // the monthly counter — use Org_Ops_Consumption_from_License__c instead
        opsConsumedCurrMonth: isMMS
            ? (mmsTotalOpsConsumed || 0)
            : get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c', 0),
        opsConsumedPrevMonth: get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c', 0),
        opsConsumedLast30d: get(primaryOrg, 'imt_Org_Ops_Consumed_Last_30d__c', 0),
        nbUsersCurrMonth: nbUsersTotal,
        nbUsersPrevMonth: get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c', 0),
        nbUsersActive: nbUsersActive,
        nbTeamsCurrMonth: get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c', 0),
        nbTeamsPrevMonth: get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c', 0),

        // BLOCK 7: SERVICE, NPS, CSAT
        usageScore: get(primaryOrg, 'imt_Usage_Score__c', 0),
        csatAverage: get(primaryOrg, 'CSAT_Average__c'),
        csatCount: get(primaryOrg, 'CSAT_Count__c', 0),
        npsAverage: get(primaryOrg, 'NPS_Average__c'),
        npsCount: get(primaryOrg, 'NPS_Count__c', 0),
        healthScoreAverage: get(primaryOrg, 'HealthScore_Average__c'),
        healthScoreCount: get(primaryOrg, 'HealthScore_Count__c', 0),
        nbOfOpenTickets: get(primaryOrg, 'Nb_of_Open_Tickets__c', 0),
        nbOfTickets: get(primaryOrg, 'Nb_of_Tickets__c', 0),

        // BLOCK 8: CHURN FORENSICS
        churnRiskStatus: get(opp, 'imt_Churn_Risk__c') ? String(get(opp, 'imt_Churn_Risk__c')).toUpperCase() : null, 
        churnStatus: get(opp, 'imt_Churn_Status__c'),
        churnReason: get(opp, 'imt_Churn_Reason__c'),
        churnRequestDetails: get(opp, 'imt_Churn_Request_Details__c') || "",
        churnValue: get(opp, 'imt_Make_Estimated_Churn_Value__c', 0),

        // BLOCK 9: SALES METADATA
        oppType: preciseOppType,
        dealType: dealType,
        isMMS:    isMMS,
        recordType: ['Auto-Renewal', 'Manual Renewal'].includes(preciseOppType) ? 'O02' : (preciseOppType === 'Land' ? 'O04' : 'O04'),
        renewalType: (() => {
            // Only classify renewalType for O02 record types — O04 opps with "Auto Renewal"
            // in the name are data quality issues in Salesforce (e.g. DIGITALL)
            if (preciseOppType !== 'Auto-Renewal' && preciseOppType !== 'Manual Renewal') return '';
            const sfVal = get(opp, 'Renewal_Type__c') || '';
            const name = get(opp, 'Name') || '';
            // Normalise to consistent values regardless of source
            if (/auto.?renewal/i.test(sfVal) || /auto.?renewal/i.test(name)) return 'Auto-Renewal';
            if (/manual.?renewal/i.test(sfVal) || /manual.?renewal/i.test(name)) return 'Manual Renewal';
            return '';
        })(),
        stageNameStatus: get(opp, 'StageName'),
        amountConvertedUSD: get(opp, 'AmountConvertedUSD__c', 0),
        sumRenewalAmount: get(primaryOrg, 'Sum_Renewal_Amount__c', 0),
        contractDuration: get(primaryOrg, 'Contract_Duration__c', 0),
        expansionPotential: get(primaryOrg, 'Expansion_Potential__c', 0),
        projectTimelineFrom: get(opp, 'CreatedDate', '').split('T')[0], 
        projectTimelineTo: get(opp, 'CloseDate', '').split('T')[0],
        
        // BLOCK 10: PRE-SALES & STRATEGY
        executiveSummary: get(opp, 'Executive_Summary__c') || "",
        notes: get(opp, 'imt_Notes__c') || "",
        nextStep: get(opp, 'Next_Step__c') || "",
        preSalesNextSteps: get(opp, 'imt_Pre_Sales_Next_Steps__c') || "",
        preSalesConfidence: get(opp, 'imt_Pre_Sales_confidence_for_Quarter__c') || "",
        techRisksGaps: get(opp, 'imt_Tech_Risks_Gaps__c') || "",

        // BLOCK 11: FIRMOGRAPHICS & COUNTRY
        totalARR: get(account, 'Integromat_ARR_USD__c', 0),
        nextRenewalDate: get(account, 'Next_Renewal_Date__c'),
        companySize: get(account, 'imt_Company_Size__c'),
        billingCountry: get(account, 'BillingCountry'),
        billingCountryCode: get(account, 'BillingCountryCode'),
        makeMarket: makeMarket,

        // BLOCK 12: MANAGEMENT & EVENTS
        // Events and engagement counts only go to the highest-priority opp (isTopOpp).
        // All other opps get zeroes so their Monday items don't show stale event data.
        calculatedPriority: priorityVal,
        pastMeetingsL30D: isTopOpp ? pastMeetingsL30D : 0,
        pastMeetingsL12M: isTopOpp ? pastMeetingsL12M : 0,
        upcomingMeetingsCount: isTopOpp ? upcomingMeetings : 0,
        workshopsDeliveredCount: isTopOpp ? workshopsDelivered : 0,
        workshopsPlannedCount: isTopOpp ? workshopsPlanned : 0,
        workshopsPlannedNext2M: isTopOpp ? workshopsPlannedNext2M : 0,
        totalEngagementsL2M: isTopOpp ? (pastMeetingsL30D + workshopsDelivered) : 0,
        recentEvents: isTopOpp ? formattedEvents : [],

        // BLOCK 13: SNOWFLAKE TOTALS
        flatCreditsLastMonth: totalL,
        flatSnowflakeTrend: overallTrend,
        
        // BLOCK 14: POWER USER SAFETY
        topUserName: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_NAME') || 'Unknown') : 'Unknown',
        topUserEmail: sfUsers.length > 0 ? (getString(sfUsers[0], 'EMAIL') || 'no-email-found@make.com') : 'no-email-found@make.com',
        topUserRole: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_JOB_ROLE') || 'Unknown') : 'Unknown',
        topUserCreditsLastMonth: sfUsers.length > 0 ? getVal(sfUsers[0], 'CREDITS_LAST_MONTH') : 0,

        // BLOCK 15: EXPANSION FRAMEWORK
        expansionLevel: expansionLevel,

        // BLOCK 16: URGENCY (replaces AI Categorize module 76 in Scenario 2)
        urgencyLevel:   urgency.level,
        urgencyDetails: urgency.details,

        // THE AGENT BRAIN
        agent_payload_string: JSON.stringify(agentPayload),
        activeFunctions: activeFunctions,

        // BLOCK 17: MONDAY COLUMN VALUES INPUT BUNDLE
        // Pre-packages all fields needed by BuildMondayColumnValues.js into a
        // single JSON string so the Make Code module only needs 3 inputs total,
        // rather than ~35 individually declared input variables.
        mondayDataJson: JSON.stringify({
            oppName:                    get(opp, 'Name'),
            oppId:                      oppId,
            accountId:                  get(account, 'Id'),
            orgIdRaw:                   orgIdRaw || "LEAD_NO_ORG",
            orgZone:                    zoneNameRaw,
            companyName:                companyName,
            companySize:                get(account, 'imt_Company_Size__c'),
            billingCountry:             get(account, 'BillingCountry'),
            billingCountryCode:         get(account, 'BillingCountryCode'),
            makeMarket:                 makeMarket,
            integromatOwner:            get(account, 'Integromat_Owner__r.Name'),
            leadVE:                     get(account, 'imt_Make_Lead_VE__r.Name'),
            leadVEManager:              get(account, 'imt_Make_Lead_VE__r.Manager.Name'),
            notOnOppTeamFlag:           false,
            oppType:                    preciseOppType,
            renewalType:                (() => {
                const sfVal = get(opp, 'Renewal_Type__c');
                if (sfVal) return sfVal;
                const name = get(opp, 'Name') || '';
                if (/auto[\s-]?renewal/i.test(name)) return 'Auto-Renewal';
                if (/manual[\s-]?renewal/i.test(name)) return 'Manual Renewal';
                return '';
            })(),
            stageNameStatus:            get(opp, 'StageName'),
            calculatedPriority:         priorityVal,
            expansionLevel:             expansionLevel,
            expansionScoreRollUp:       get(account, 'Make_Expansion_Score_RollUp__c', 0),
            amountConvertedUSD:         get(opp, 'AmountConvertedUSD__c', 0),
            totalARR:                   get(account, 'Integromat_ARR_USD__c', 0),
            sumRenewalAmount:           get(primaryOrg, 'Sum_Renewal_Amount__c', 0),
            contractDuration:           get(primaryOrg, 'Contract_Duration__c', 0),
            projectTimelineFrom:        get(opp, 'CreatedDate', '').split('T')[0],
            projectTimelineTo:          get(opp, 'CloseDate', '').split('T')[0],
            nextRenewalDate:            get(account, 'Next_Renewal_Date__c'),
            churnRiskStatus:            get(opp, 'imt_Churn_Risk__c') ? String(get(opp, 'imt_Churn_Risk__c')).toUpperCase() : null,
            churnValue:                 get(opp, 'imt_Make_Estimated_Churn_Value__c', 0),
            urgencyLevel:               urgency.level,
            sfOppUrl:                   get(opp, 'Opportunity_Link__c'),
            sfOppLinkText:              oppId,
            freshdeskUrl:               get(primaryOrg, 'imt_FDESK_Company_URL__c') || "https://make-hq.freshdesk.com/a/companies/",
            freshdeskLinkText:          companyName,
            sigmaUrl:                   `https://app.sigmacomputing.com/make/workbook/Customer-Insights-2xZI2ksPDfzGkveIgKqDCA?Org-Id-Input=${sigmaId}`,
            sigmaLinkText:              sigmaId,
            makeDashboardUrl:           orgDashboardUrl,
            makeDashboardLinkText:      `${zoneNameRaw} (${orgIdRaw || "Lead"})`,
            topUserName:                sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_NAME') || 'Unknown') : 'Unknown',
            topUserEmail:               sfUsers.length > 0 ? (getString(sfUsers[0], 'EMAIL') || 'no-email-found@make.com') : 'no-email-found@make.com',
            opsInPlan:                  get(primaryOrg, 'imt_Org_Ops_In_Plan__c', 0),
            opsLeftInPlan:              get(primaryOrg, 'imt_Org_Ops_Left_In_Plan__c', 0),
            opsLeftInPlanWithExtra:     get(primaryOrg, 'imt_Org_Ops_Left_In_Plan_w_Extra__c', 0),
            extraOpsInPlan:             get(primaryOrg, 'imt_Org_Extra_Ops_In_Plan__c', 0),
            expConsumption:             get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0),
            activeScenariosCurrMonth:   get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c', 0),
            activeScenariosPrevMonth:   get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c', 0),
            trendActiveScenarios:       calcTrend(get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c'), get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c')),
            nbTeamsCurrMonth:           get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c', 0),
            nbTeamsPrevMonth:           get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c', 0),
            trendNbTeams:               calcTrend(get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c'), get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c')),
            nbUsersCurrMonth:           get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c', 0),
            nbUsersPrevMonth:           get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c', 0),
            nbUsersActive:              get(primaryOrg, 'imt_Org_Nb_Active_Users_Curr_Month__c', 0),
            trendNbUsers:               calcTrend(get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c'), get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c')),
            opsConsumedCurrMonth:       isMMS ? (mmsTotalOpsConsumed || 0) : get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c', 0),
            opsConsumedPrevMonth:       get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c', 0),
            trendOpsConsumed:           calcTrend(get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c'), get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c')),
            listOfAppsUsed:             get(primaryOrg, 'List_of_Apps_Used__c', null) || null,
            csatAverage:                get(primaryOrg, 'CSAT_Average__c'),
            csatCount:                  get(primaryOrg, 'CSAT_Count__c', 0),
            healthScoreAverage:         get(primaryOrg, 'HealthScore_Average__c'),
            healthScoreCount:           get(primaryOrg, 'HealthScore_Count__c', 0),
            npsAverage:                 get(primaryOrg, 'NPS_Average__c'),
            npsCount:                   get(primaryOrg, 'NPS_Count__c', 0),
            nbOfOpenTickets:            get(primaryOrg, 'Nb_of_Open_Tickets__c', 0),
            nbOfTickets:                get(primaryOrg, 'Nb_of_Tickets__c', 0),
            usageScore:                 get(primaryOrg, 'imt_Usage_Score__c', 0),
            totalEngagementsL2M:        isTopOpp ? (pastMeetingsL30D + workshopsDelivered) : 0,
            pastMeetingsL12M:           isTopOpp ? pastMeetingsL12M : 0,
            pastMeetingsL30D:           isTopOpp ? pastMeetingsL30D : 0,
            upcomingMeetingsCount:      isTopOpp ? upcomingMeetings : 0,
            workshopsDeliveredCount:    isTopOpp ? workshopsDelivered : 0,
            workshopsPlannedCount:      isTopOpp ? workshopsPlanned : 0,
            workshopsPlannedNext2M:     isTopOpp ? workshopsPlannedNext2M : 0
        })
    }); // end transformedItems.push

    } // end for oppRecords loop
  } // end for accountsArray loop
  return transformedItems;
}

const accountsArray = (accountData && accountData.sfdcResults)
    ? accountData.sfdcResults
    : (Array.isArray(accountData) ? accountData : [accountData]);

return transformOpportunities(accountsArray);
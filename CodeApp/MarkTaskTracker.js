const accountData = input.inputData;
const windowStart = input.priorityWindowStart; 
const windowEnd = input.priorityWindowEnd;

// --- STEP 1: BULLETPROOF SNOWFLAKE EXTRACTION ---
// Handles both flat array and nested .rows formats
function extractSnowflakeData(inputArray) {
    if (!inputArray || !Array.isArray(inputArray) || inputArray.length === 0) return [];
    if (inputArray[0].rows && Array.isArray(inputArray[0].rows)) return inputArray[0].rows;
    return inputArray;
}

const sfTeams = extractSnowflakeData(input.snowflakeTeams);
const sfUsers = extractSnowflakeData(input.snowflakeUsers);

/**
 * Calculates Management Priority based on Renewal, Consumption, and Score
 */
function calculateManagementPriority(renewalDateStr, expConsumption, expScore, startStr, endStr) {
    if (!renewalDateStr || !startStr || !endStr) return "None";
    const renewalDate = new Date(renewalDateStr);
    const wStart = new Date(startStr);
    const wEnd = new Date(endStr);
    const isCriticalRenewal = (renewalDate >= wStart && renewalDate <= wEnd);

    if (isCriticalRenewal) {
        if (expConsumption > 79) return "Priority 1";
        if (expConsumption >= 60) return "Priority 2";
        if (expScore >= 0.4) return "Priority 3";
        return "None";
    } else {
        if (expScore > 0.4) return "Priority 4";
        return "None";
    }
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

  for (const account of accountsArray) {
    // --- CRITICAL ERROR TRIGGER: NO OPPORTUNITY FOUND ---
    const oppRecords = get(account, 'Opportunities.records', []);
    if (oppRecords.length === 0) {
        throw new Error(`CRITICAL_MISSING_OPPORTUNITY: No Opportunity found for ${get(account, 'Name')}.`);
    }

    const opp = oppRecords[0]; 
    const oppId = get(opp, 'Id');
    const companyName = get(account, 'Name');

    // --- STEP 2: SELECT PRIMARY ORG (SOQL LIMITED) ---
    const lifeCycles = get(account, 'Make_LifeCycles__r.records', []);
    const primaryOrg = lifeCycles[0] || {};
    const orgIdRaw = get(primaryOrg, 'imt_Make_OrgId__c');
    const isLead = !orgIdRaw; 
    const sigmaId = orgIdRaw ? `m_${orgIdRaw}` : "N/A";

    // --- NEW: ZONE & DASHBOARD URL CALCULATION ---
    const zoneNameRaw = get(primaryOrg, 'imt_Org_Zone_Name__c', 'us1'); 
    const lowerZone = zoneNameRaw.toLowerCase();
    const zoneUrlPart = lowerZone.startsWith('ent_') 
        ? lowerZone.replace('ent_', '') + '.make.celonis.com' 
        : lowerZone + '.make.com';
    
    const orgDashboardUrl = `https://${zoneUrlPart}/admin/organization/${orgIdRaw}/dashboard`;

    // --- PHASE 2: EVENT AGGREGATION ---
    const eventRecords = get(account, 'Events.records', []);
    const now = new Date();
    let pastMeetings = 0, upcomingMeetings = 0, workshopsDelivered = 0, workshopsPlanned = 0;

    const formattedEvents = eventRecords.map(event => {
        const eDate = get(event, 'Activity_Date__c');
        const eType = get(event, 'Activity_Type__c', 'Meeting');
        const eDelivered = get(event, 'Delivered__c', 'No');
        const eventDate = eDate ? new Date(eDate) : null;

        if (eventDate) {
            if (eType === "Workshop") {
                if (eDelivered === "Yes" || eventDate < now) workshopsDelivered++;
                if (eDelivered === "Open" && eventDate >= now) workshopsPlanned++;
            } else if (eType.includes("Meeting")) {
                if (eventDate < now) pastMeetings++;
                if (eventDate >= now) upcomingMeetings++;
            }
        }
        // Updated to return enhanced metadata for Agent context
        return { 
            subject: get(event, 'Subject'), 
            type: eType, 
            date: eDate, 
            delivered: eDelivered,
            owner: get(event, 'Owner_Full_Name__c'),
            goal: get(event, 'Goal_of_Meeting__c')
        };
    });

    // --- PHASE 3: SNOWFLAKE SYNTHESIS ---
    let totalL = 0, total2 = 0;
    const teamSummaryForAgent = isLead ? [] : sfTeams.map(t => {
        const cL = getVal(t, 'CREDITS_LAST_MONTH'), c2 = getVal(t, 'CREDITS_2_MONTHS_AGO');
        totalL += cL; total2 += c2;
        return { t: getString(t, 'TEAM_NAME'), c: cL, tr: (c2 > 0) ? Math.round(((cL - c2) / c2) * 100) : 0 };
    }).filter(t => t.c > 0);

    const powerUserSummaryForAgent = isLead ? "No active usage" : sfUsers.slice(0, 3).map(u => {
        return `${getString(u, 'USER_NAME') || 'Unknown'} (${getString(u, 'USER_JOB_ROLE') || 'No Role'}): ${getVal(u, 'CREDITS_LAST_MONTH')} credits. Exp: ${getString(u, 'USER_AUTOMATION_EXPERIENCE') || 'Unknown'}`;
    }).join(' | ');

    const overallTrend = total2 > 0 ? Math.round(((totalL - total2) / total2) * 100) : 0;
    const priorityVal = calculateManagementPriority(
        get(account, 'Next_Renewal_Date__c'), 
        get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0), 
        get(account, 'Make_Expansion_Score_RollUp__c', 0),
        windowStart, windowEnd
    );

    // EXTRACT ACTIVE USERS (Rudderstack verified events)
    const nbUsersActive = get(primaryOrg, 'imt_Org_Nb_Active_Users_Curr_Month__c', 0);
    const nbUsersTotal = get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c', 0);

    // --- PHASE 4: ENRICHED AI STRATEGIST PAYLOAD ---
    const agentPayload = {
        acc: { id: get(account, 'Id'), n: companyName, arr: get(account, 'Integromat_ARR_USD__c', 0), pr: priorityVal },
        comm: { 
            st: get(opp, 'StageName') || "Unknown Stage", 
            type: isLead ? 'Land' : 'Expand', 
            risk: get(opp, 'imt_Churn_Risk__c') || "Unspecified", 
            sum: get(opp, 'Executive_Summary__c') ? get(opp, 'Executive_Summary__c').substring(0, 500) : "[MISSING_EXECUTIVE_SUMMARY]",
            notes: get(opp, 'imt_Notes__c') ? get(opp, 'imt_Notes__c').substring(0, 400) : "[MISSING_TECHNICAL_NOTES]",
            next: get(opp, 'Next_Step__c') ? get(opp, 'Next_Step__c').substring(0, 300) : "[MISSING_NEXT_STEPS]"
        },
        tech: { apps: (get(primaryOrg, 'List_of_Apps_Used__c') || "None Listed"), isLead: isLead },
        ve: { p: pastMeetings, d: workshopsDelivered, events: formattedEvents },
        snk: { trend: overallTrend, credits: totalL, teams: teamSummaryForAgent, users: powerUserSummaryForAgent },
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
        orgPlan: get(primaryOrg, 'imt_Org_Plan__c', "Prospect"),
        opsInPlan: get(primaryOrg, 'imt_Org_Ops_In_Plan__c', 0),
        extraOpsInPlan: get(primaryOrg, 'imt_Org_Extra_Ops_In_Plan__c', 0),
        opsLeftInPlan: get(primaryOrg, 'imt_Org_Ops_Left_In_Plan__c', 0),
        opsLeftInPlanWithExtra: get(primaryOrg, 'imt_Org_Ops_Left_In_Plan_w_Extra__c', 0),
        expConsumption: get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0),
        listOfAppsUsed: get(primaryOrg, 'List_of_Apps_Used__c', "None (Pre-Adoption)"),

        // BLOCK 5: USAGE TRENDS
        trendActiveScenarios: calcTrend(get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c'), get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c')),
        trendNbUsers: calcTrend(get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c'), get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c')),
        trendOpsConsumed: calcTrend(get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c'), get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c')),
        trendNbTeams: calcTrend(get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c'), get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c')),

        // BLOCK 6: RAW USAGE
        activeScenariosCurrMonth: get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c', 0),
        opsConsumedCurrMonth: get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c', 0),
        opsConsumedPrevMonth: get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c', 0),
        opsConsumedLast30d: get(primaryOrg, 'imt_Org_Ops_Consumed_Last_30d__c', 0),
        nbUsersCurrMonth: nbUsersTotal,
        nbUsersActive: nbUsersActive, // Mapped to Monday column numeric_mm38vnyg
        nbTeamsCurrMonth: get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c', 0),

        // BLOCK 7: SERVICE, NPS, CSAT (RESTORED ALL METRICS)
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
        churnValue: get(opp, 'imt_Make_Estimated_Churn_Value__c', 0),

        // BLOCK 9: SALES METADATA
        oppType: get(opp, 'Type', 'Land'),
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
        techRisksGaps: get(opp, 'imt_Tech_Risks_Gaps__c') || "",

        // BLOCK 11: FIRMOGRAPHICS & COUNTRY
        totalARR: get(account, 'Integromat_ARR_USD__c', 0),
        nextRenewalDate: get(account, 'Next_Renewal_Date__c'),
        companySize: get(account, 'imt_Company_Size__c'),
        billingCountry: get(account, 'BillingCountry'),
        billingCountryCode: get(account, 'BillingCountryCode'),

        // BLOCK 12: MANAGEMENT & EVENTS
        calculatedPriority: priorityVal,
        pastMeetingsCount: pastMeetings,
        upcomingMeetingsCount: upcomingMeetings,
        workshopsDeliveredCount: workshopsDelivered,
        workshopsPlannedCount: workshopsPlanned,
        totalEngagementsLast60Days: (pastMeetings + workshopsDelivered),
        recentEvents: formattedEvents,

        // BLOCK 13: SNOWFLAKE TOTALS
        flatCreditsLastMonth: totalL,
        flatSnowflakeTrend: overallTrend,
        
        // BLOCK 14: POWER USER SAFETY
        topUserName: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_NAME') || "Unknown") : "Unknown",
        topUserEmail: sfUsers.length > 0 ? (getString(sfUsers[0], 'EMAIL') || "no-email-found@make.com") : "no-email-found@make.com",
        topUserRole: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_JOB_ROLE') || "Unknown") : "Unknown",
        topUserCreditsLastMonth: sfUsers.length > 0 ? getVal(sfUsers[0], 'CREDITS_LAST_MONTH') : 0,

        // THE AGENT BRAIN
        agent_payload_string: JSON.stringify(agentPayload)
    });
  }
  return transformedItems;
}

return transformOpportunities([accountData]);
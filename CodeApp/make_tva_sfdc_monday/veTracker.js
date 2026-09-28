const accountData = input.inputData;

// --- STEP 1: BULLETPROOF SNOWFLAKE EXTRACTION ---
function extractSnowflakeData(inputArray) {
    if (!inputArray || !Array.isArray(inputArray) || inputArray.length === 0) return [];
    if (inputArray[0].rows && Array.isArray(inputArray[0].rows)) return inputArray[0].rows;
    return inputArray;
}

const allSnowflakeTeams = extractSnowflakeData(input.snowflakeTeams);
const allSnowflakeUsers = extractSnowflakeData(input.snowflakeUsers);

const allAcademyUsers = extractSnowflakeData(input.snowflakeAcademy || []);
const academyByOrg = {};
allAcademyUsers.forEach(u => {
    const id = String(u.ORG_ID || u.org_id || '').replace(/^m_/, '');
    if (!academyByOrg[id]) academyByOrg[id] = [];
    academyByOrg[id].push(u);
});

const appsMap = (input.appsMap && typeof input.appsMap === 'object' && !Array.isArray(input.appsMap))
    ? input.appsMap
    : {};

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

// ── Academy helpers ───────────────────────────────────────────────────────────
function parseAgg(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean);
    if (typeof val === 'object') {
        const vals = Object.values(val).filter(Boolean);
        return vals.length ? vals : [];
    }
    try { const p = JSON.parse(val); return Array.isArray(p) ? p.filter(Boolean) : []; }
    catch { return String(val).split(',').map(s => s.trim()).filter(Boolean); }
}

function academySummary(users) {
    if (!users || users.length === 0) return null;
    const courses  = [...new Set(users.flatMap(u => parseAgg(u.COURSES_COMPLETED || u.courses_completed || u.coursesArray || u.COURSESARRAY)))].filter(Boolean);
    const badges   = [...new Set(users.flatMap(u => parseAgg(u.BADGES_EARNED    || u.badges_earned    || u.badgesArray  || u.BADGESARRAY)))].filter(Boolean);
    const totalCompleted = users.reduce((s, u) => s + (Number(u.COURSES_COMPLETED_COUNT || u.courses_completed_count || u.coursesCompletedCount || 0)), 0);
    const lastAt   = users.map(u => u.LAST_COURSE_COMPLETED_AT || u.last_course_completed_at || u.lastCourseCompletedAt).filter(Boolean).sort().pop() || null;
    const npsVals  = users.map(u => Number(u.NPS_CURRENT_VALUE || u.nps_current_value)).filter(v => !isNaN(v) && v !== 0);
    const avgNps   = npsVals.length ? Math.round(npsVals.reduce((a,b) => a+b, 0) / npsVals.length) : null;
    const usersWithBadge = users.filter(u => parseAgg(u.BADGES_EARNED || u.badges_earned).length > 0).length;
    const isTrue = v => v === true || String(v).toLowerCase() === 'true' || v === 1 || String(v) === '1';
    const featureFlags = {
        hasUsedRouter:       users.some(u => isTrue(u.HAS_USED_ROUTER) || isTrue(u.has_used_router) || isTrue(u.hasUsedRouter)),
        hasUsedJson:         users.some(u => isTrue(u.HAS_USED_JSON) || isTrue(u.has_used_json) || isTrue(u.hasUsedJson)),
        hasUsedErrorHandler: users.some(u => isTrue(u.HAS_USED_ERROR_HANDLER) || isTrue(u.has_used_error_handler) || isTrue(u.hasUsedErrorHandler)),
        hasActiveWebhook:    users.some(u => isTrue(u.HAS_ACTIVE_WEBHOOK) || isTrue(u.has_active_webhook) || isTrue(u.hasActiveWebhook)),
    };
    return { courses, badges, totalCompleted, lastAt, avgNps, usersWithBadge, featureFlags };
}

function calculateManagementPriority(renewalDateStr, expConsumption, expScore) {
    if (!renewalDateStr) return "None";

    const renewalDate = new Date(renewalDateStr);
    const fyStart = new Date('2026-02-01');
    const h2Start = new Date('2026-08-01');
    const fyEnd   = new Date('2027-02-01');

    const isRenewingThisYear = (renewalDate >= fyStart && renewalDate < fyEnd);
    const isH1 = (renewalDate >= fyStart && renewalDate < h2Start);

    if (isRenewingThisYear) {
        if (isH1 && expConsumption > 80) return "Priority 1";
        if (!isH1 && expConsumption > 80) return "Priority 2";
        if (expScore >= 0.5) return "Priority 3";
    } else {
        if (expConsumption > 80) return "Priority 4";
        if (expScore >= 0.4) return "Priority 5";
    }

    return "None";
}

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
    const account = rawItem.SalesforceBundle ? rawItem.SalesforceBundle : rawItem;
    const oppRecords = get(account, 'Opportunities.records', []);
    if (oppRecords.length === 0) continue;

    const companyName = get(account, 'Name');

    // --- ACCOUNT METADATA & CROSSBEAM EXTRACTIONS ---
    const aiMandateLikelihood      = get(account, 'imt_AI_Mandate_Likelihood__c', 'Low');
    const aiLikelihoodExplanation = get(account, 'imt_AI_Likelihood_Explanation__c', '');
    const accountPriority          = get(account, 'Account_Priority__c', 'None');
    const isReferenceable          = get(account, 'Referenceable_legal__c') === 'Yes';
    const safebaseUrl              = get(account, 'safebase__Account_Share_Link__c');
    const industry                 = get(account, 'Industry', '');
    const revenueBand              = get(account, 'Revenue_Bands__c', '');
    const annualRevenueUsd         = get(account, 'Annual_Revenue_USD__c', 0);

    const crossbeamRecords = get(account, 'xbeamprod__Overlaps__r.records', []);
    const formattedCrossbeam = crossbeamRecords.map(cb => ({
        sfId:              get(cb, 'Id'),
        partnerName:       get(cb, 'xbeamprod__Partner_Name__c'),
        partnerPopulation: get(cb, 'xbeamprod__Partner_Standard_Populations__c'),
        myPopulation:      get(cb, 'xbeamprod__Standard_Populations__c')
    }));
    const crossbeamSummary = formattedCrossbeam.length > 0
        ? formattedCrossbeam.map(cb => `${cb.partnerName}${cb.partnerPopulation ? ` (${cb.partnerPopulation})` : ''}`).join(', ')
        : 'No active ecosystem overlaps';

    const lifecyclesByAccount = {};
    if (Array.isArray(input.lifecycleRecords) && input.lifecycleRecords.length > 0) {
        input.lifecycleRecords.forEach(lc => {
            const acctId = lc.Account__c;
            if (!acctId) return;
            if (!lifecyclesByAccount[acctId]) lifecyclesByAccount[acctId] = [];
            lifecyclesByAccount[acctId].push(lc);
        });
    }

    const accountId   = get(account, 'Id');
    const lcFromInput = lifecyclesByAccount[accountId];
    const lifeCycles  = lcFromInput
        ? [...lcFromInput].sort((a, b) => {
            const aIsMMS = a.Deal_Type__c === 'MMS' ? 0 : 1;
            const bIsMMS = b.Deal_Type__c === 'MMS' ? 0 : 1;
            if (aIsMMS !== bIsMMS) return aIsMMS - bIsMMS;
            const aIsParent = !a.Parent_Org__c ? 0 : 1;
            const bIsParent = !b.Parent_Org__c ? 0 : 1;
            if (aIsParent !== bIsParent) return aIsParent - bIsParent;
            return (b.imt_Usage_Score__c || 0) - (a.imt_Usage_Score__c || 0);
          })
        : get(account, 'Make_LifeCycles__r.records', []);

    const primaryOrg = lifeCycles[0] || {};
    const orgIdRaw = get(primaryOrg, 'imt_Make_OrgId__c');
    const isLead   = !orgIdRaw;
    const sigmaId  = orgIdRaw ? `m_${orgIdRaw}` : "N/A";
    const dealType = get(primaryOrg, 'Deal_Type__c', null);
    const isMMS    = dealType === 'MMS';

    const mmsTotalOpsConsumed = isMMS && lcFromInput
        ? lcFromInput.reduce((sum, lc) => sum + (lc.Org_Ops_Consumption_from_License__c || 0), 0)
        : null;

    const mmsExpConsumptionPct = isMMS && mmsTotalOpsConsumed > 0
        ? (() => {
            const plan = get(primaryOrg, 'Contract_Ops_In_Plan__c', 0)
                      || get(primaryOrg, 'imt_Org_Ops_In_Plan__c', 0);
            return plan > 0 ? Math.round((mmsTotalOpsConsumed / plan) * 100) : 0;
          })()
        : null;

    const zoneNameRaw = get(primaryOrg, 'imt_Org_Zone_Name__c', 'us1');
    const lowerZone = zoneNameRaw.toLowerCase();
    const zoneUrlPart = lowerZone.startsWith('ent_')
        ? lowerZone.replace('ent_', '') + '.make.celonis.com'
        : lowerZone + '.make.com';
    const orgDashboardUrl = `https://${zoneUrlPart}/admin/organization/${orgIdRaw}/dashboard`;

    const billingCountryCode = (get(account, 'BillingCountryCode') || '').toUpperCase().trim();
    const billingCountryName = (get(account, 'BillingCountry') || '').toLowerCase().trim();

    function deriveMakeMarket(code, name) {
        if (code === 'US' || code === 'CA') return 'USA (including CA)';
        if (code === 'DE') return 'Germany';
        if (code === 'FR') return 'France';
        if (code === 'GB') return 'UK';
        if (code === 'BR') return 'Brazil';
        if (code === 'ES') return 'Spain';
        if (code === 'IL') return 'Israel';
        const spanishLatam = ['AR','BO','CL','CO','CR','CU','DO','EC','GT','HN','MX','NI','PA','PE','PR','PY','SV','UY','VE'];
        if (spanishLatam.includes(code)) return 'Spanish-speaking LATAM';
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

    const allEventRecords = get(account, 'Events.records', []);
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

    const formattedEvents = allEventRecords.map(event => {
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
            rejectedComments:   get(event, 'Rejected_Comments__c'),
            rescheduled:        get(event, 'Rescheduled__c') === true || get(event, 'Rescheduled__c') === 'true',
            assigned:           get(event, 'Owner.Name') || get(event, 'OwnerId') || null
        };
    });

    const sfTeams = snowflakeTeamsByOrg[String(orgIdRaw)] || [];
    const sfUsers = snowflakeUsersByOrg[String(orgIdRaw)] || [];
    const sfAcademy = academyByOrg[String(orgIdRaw)] || [];
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

    const oppTypeSortKey = (o) => {
        const rt   = get(o, 'RecordType.Name', '');
        const rtId = get(o, 'RecordTypeId', '');
        const name = get(o, 'Name', '');
        const sfType = get(o, 'Type', '');
        if (/expand|expansion/i.test(sfType) || rt.includes('O04') || rtId === '01207000000bpeJAAQ') return 1;
        if ((rt.includes('O02') || rtId === '0121v000000aUhnAAE') && !name.includes('Auto Renewal')) return 2;
        if ((rt.includes('O02') || rtId === '0121v000000aUhnAAE') &&  name.includes('Auto Renewal')) return 3;
        return 4;
    };
    oppRecords.sort((a, b) => oppTypeSortKey(a) - oppTypeSortKey(b));

    for (let oppIdx = 0; oppIdx < oppRecords.length; oppIdx++) {
        const opp = oppRecords[oppIdx];
        const oppId = get(opp, 'Id');
        const isTopOpp = oppIdx === 0;

        // 1. BUSINESS UNIT GATE: Only process Make opportunities
        const celonisBU = get(opp, 'Celonis_Business_Unit__c');
        if (celonisBU !== 'Integromat/Make') {
            continue;
        }

        // 2. UNIVERSAL LEAD VE FALLBACK: Opp level first, Account level fallback
        const leadVE = get(opp, 'imt_Make_Lead_VE__r.Name') 
                    || get(account, 'imt_Make_Lead_VE__r.Name');
        const leadVEEmail = get(opp, 'imt_Make_Lead_VE__r.Email') 
                         || get(account, 'imt_Make_Lead_VE__r.Email');
        const leadVEManager = get(opp, 'imt_Make_Lead_VE__r.Manager.Name') 
                           || get(account, 'imt_Make_Lead_VE__r.Manager.Name');
        const leadVEManagerEmail = get(opp, 'imt_Make_Lead_VE__r.Manager.Email') 
                                || get(account, 'imt_Make_Lead_VE__r.Manager.Email');

        // 3. DYNAMIC CLASSIFICATION: Inspects "Type" field first
        const sfType = get(opp, 'Type', '');
        const oppNameRaw = get(opp, 'Name', '');
        const recordTypeName = get(opp, 'RecordType.Name', '');
        const recordTypeId = get(opp, 'RecordTypeId', '');
        const renewalTypeRaw = get(opp, 'Renewal_Type__c', '');

        let preciseOppType = 'Expand';

        if (/expand|expansion/i.test(sfType)) {
            preciseOppType = 'Expand';
        } else if (/land|new customer/i.test(sfType)) {
            preciseOppType = 'Land';
        } else if (recordTypeName.includes('O04') || recordTypeId === '01207000000bpeJAAQ') {
            preciseOppType = 'Expand';
        } else if (recordTypeName.includes('O02') || recordTypeId === '0121v000000aUhnAAE' || /renewal/i.test(sfType)) {
            const isAuto = /auto.?renewal/i.test(renewalTypeRaw) || /auto.?renewal/i.test(oppNameRaw);
            preciseOppType = isAuto ? 'Auto-Renewal' : 'Manual Renewal';
        } else if (isLead) {
            preciseOppType = 'Land';
        } else {
            preciseOppType = 'Expand';
        }

        const urgency = calculateUrgency(preciseOppType, priorityVal, get(opp, 'imt_Churn_Risk__c'));

        const agentPayload = {
            acc:  { 
                id: get(account, 'Id'), 
                n: companyName, 
                arr: currentARR, 
                pr: priorityVal, 
                level: expansionLevel,
                aiLikelihood: aiMandateLikelihood,
                aiExplanation: aiLikelihoodExplanation,
                priorityTier: accountPriority,
                isReferenceable: isReferenceable,
                industry: industry,
                revenueBand: revenueBand
            },
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
            tech: { 
                apps: (get(primaryOrg, 'List_of_Apps_Used__c') || "None Listed"), 
                isLead: isLead,
                crossbeam: crossbeamSummary 
            },
            ve:   { p: pastMeetingsL60D, d: workshopsDelivered, events: isTopOpp ? formattedEvents : [] },
            snk:  { trend: overallTrend, credits: totalL, consumption: get(primaryOrg, 'imt_Exp_Consumption_End_Val_Period__c', 0), teams: teamSummaryForAgent, users: powerUserSummaryForAgent, functions: activeFunctions },
            users: { active: nbUsersActive, total: nbUsersTotal, gap: (nbUsersTotal - nbUsersActive) }
        };

        transformedItems.push({
            oppName: get(opp, 'Name'), 
            oppId: oppId, 
            accountId: get(account, 'Id'), 
            lifecycleSfId: get(primaryOrg, 'Id'),
            companyName: companyName,
            expansionScoreRollUp: get(account, 'Make_Expansion_Score_RollUp__c', 0), 
            
            integromatOwner: get(account, 'Integromat_Owner__r.Name'), 
            leadVE: leadVE, 
            leadVEEmail: leadVEEmail,
            leadVEManager: leadVEManager, 
            leadVEManagerEmail: leadVEManagerEmail,
            bdrOwner: get(account, 'imt_Make_BDR__r.Name'),

            sfOppUrl: get(opp, 'Opportunity_Link__c'),
            sfOppLinkText: oppId,
            freshdeskUrl: get(primaryOrg, 'imt_FDESK_Company_URL__c') || "https://make-hq.freshdesk.com/a/companies/",
            freshdeskLinkText: companyName,
            sigmaUrl: `https://app.sigmacomputing.com/make/workbook/Customer-Insights-2xZI2ksPDfzGkveIgKqDCA?Org-Id-Input=${sigmaId}`,
            sigmaLinkText: sigmaId,
            makeDashboardUrl: orgDashboardUrl, 
            makeDashboardLinkText: `${zoneNameRaw} (${orgIdRaw || "Lead"})`,

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
            listOfAppsUsed: (() => {
                const sfdc      = get(primaryOrg, 'List_of_Apps_Used__c', null);
                const snowflake = appsMap[sigmaId] || null;
                return snowflake || sfdc || null;
            })(),
            appsSourceMismatch: (() => {
                const sfdc      = get(primaryOrg, 'List_of_Apps_Used__c', null);
                const snowflake = appsMap[sigmaId] || null;
                if (!sfdc || !snowflake) return false;
                return sfdc.trim().toLowerCase() !== snowflake.trim().toLowerCase();
            })(),

            trendActiveScenarios: calcTrend(get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c'), get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c')),
            trendNbUsers: calcTrend(get(primaryOrg, 'imt_Org_Nb_Users_Curr_Month__c'), get(primaryOrg, 'imt_Org_Nb_Users_Prev_Month__c')),
            trendOpsConsumed: calcTrend(get(primaryOrg, 'imt_Org_Ops_Consumed_Curr_Month__c'), get(primaryOrg, 'imt_Org_Ops_Consumed_Prev_Month__c')),
            trendNbTeams: calcTrend(get(primaryOrg, 'imt_Org_Nb_Teams_Current_Month__c'), get(primaryOrg, 'imt_Org_Nb_Teams_Previous_Month__c')),

            activeScenariosCurrMonth: get(primaryOrg, 'imt_Org_Active_Scenarios_Curr_Month__c', 0),
            activeScenariosPrevMonth: get(primaryOrg, 'imt_Org_Active_Scenarios_Prev_Month__c', 0),
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

            usageScore: get(primaryOrg, 'imt_Usage_Score__c', 0),
            csatAverage: get(primaryOrg, 'CSAT_Average__c'),
            csatCount: get(primaryOrg, 'CSAT_Count__c', 0),
            npsAverage: get(primaryOrg, 'NPS_Average__c'),
            npsCount: get(primaryOrg, 'NPS_Count__c', 0),
            healthScoreAverage: get(primaryOrg, 'HealthScore_Average__c'),
            healthScoreCount: get(primaryOrg, 'HealthScore_Count__c', 0),
            nbOfOpenTickets: get(primaryOrg, 'Nb_of_Open_Tickets__c', 0),
            nbOfTickets: get(primaryOrg, 'Nb_of_Tickets__c', 0),

            churnRiskStatus: get(opp, 'imt_Churn_Risk__c') ? String(get(opp, 'imt_Churn_Risk__c')).toUpperCase() : null, 
            churnStatus: get(opp, 'imt_Churn_Status__c'),
            churnReason: get(opp, 'imt_Churn_Reason__c'),
            churnRequestDetails: get(opp, 'imt_Churn_Request_Details__c') || "",
            churnValue: get(opp, 'imt_Make_Estimated_Churn_Value__c', 0),

            oppType: preciseOppType,
            celonisBusinessUnit: celonisBU,
            dealType: dealType,
            isMMS:    isMMS,
            recordType: ['Auto-Renewal', 'Manual Renewal'].includes(preciseOppType) ? 'O02' : 'O04',
            renewalType: (() => {
                if (preciseOppType !== 'Auto-Renewal' && preciseOppType !== 'Manual Renewal') return '';
                const sfVal = get(opp, 'Renewal_Type__c') || '';
                const name = get(opp, 'Name') || '';
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
            projectTimelineTo: (get(opp, 'CloseDate', null) || '').split('T')[0] || null,
            
            executiveSummary: get(opp, 'Executive_Summary__c') || "",
            notes: get(opp, 'imt_Notes__c') || "",
            nextStep: get(opp, 'Next_Step__c') || "",
            preSalesNextSteps: get(opp, 'imt_Pre_Sales_Next_Steps__c') || "",
            preSalesConfidence: get(opp, 'imt_Pre_Sales_confidence_for_Quarter__c') || "",
            techRisksGaps: get(opp, 'imt_Tech_Risks_Gaps__c') || "",

            totalARR: get(account, 'Integromat_ARR_USD__c', 0),
            nextRenewalDate: get(account, 'Next_Renewal_Date__c'),
            companySize: get(account, 'imt_Company_Size__c'),
            billingCountry: get(account, 'BillingCountry'),
            billingCountryCode: get(account, 'BillingCountryCode'),
            makeMarket: makeMarket,

            // Account & AI Metadata
            aiMandateLikelihood,
            aiLikelihoodExplanation,
            accountPriority,
            isReferenceable,
            safebaseUrl,
            industry,
            revenueBand,
            annualRevenueUsd,

            // Ecosystem / Crossbeam Overlaps
            crossbeamCount: formattedCrossbeam.length,
            crossbeamSummary,
            crossbeamOverlaps: formattedCrossbeam,

            calculatedPriority: priorityVal,
            pastMeetingsL30D: isTopOpp ? pastMeetingsL30D : 0,
            pastMeetingsL12M: isTopOpp ? pastMeetingsL12M : 0,
            upcomingMeetingsCount: isTopOpp ? upcomingMeetings : 0,
            workshopsDeliveredCount: isTopOpp ? workshopsDelivered : 0,
            workshopsPlannedCount: isTopOpp ? workshopsPlanned : 0,
            workshopsPlannedNext2M: isTopOpp ? workshopsPlannedNext2M : 0,
            totalEngagementsL2M: isTopOpp ? (pastMeetingsL30D + workshopsDelivered) : 0,
            recentEvents: isTopOpp ? formattedEvents : [],

            flatCreditsLastMonth: totalL,
            flatSnowflakeTrend: overallTrend,
            
            topUserName: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_NAME') || 'Unknown') : 'Unknown',
            topUserEmail: sfUsers.length > 0 ? (getString(sfUsers[0], 'EMAIL') || 'no-email-found@make.com') : 'no-email-found@make.com',
            topUserRole: sfUsers.length > 0 ? (getString(sfUsers[0], 'USER_JOB_ROLE') || 'Unknown') : 'Unknown',
            topUserCreditsLastMonth: sfUsers.length > 0 ? getVal(sfUsers[0], 'CREDITS_LAST_MONTH') : 0,

            academySummary: academySummary(sfAcademy),
            academyUsers: (() => {
                const userById = {};
                sfUsers.forEach(su => {
                    const uid = su.USER_ID || su.userId || su.user_id;
                    if (uid) userById[uid] = su;
                });
                const isTrue = v => v === true || String(v).toLowerCase() === 'true' || v === 1 || String(v) === '1';
                return sfAcademy.map(u => {
                    const uid = u.userId || u.USER_ID || u.user_id;
                    const su  = uid ? (userById[uid] || {}) : {};
                    return ({
                        userId:       uid || null,
                        name:         su.USER_NAME || su.userName || u.name || u.NAME || null,
                        email:        su.EMAIL || su.email || u.email || u.EMAIL || null,
                        nps:          u.npsCurrentValue  || u.NPS_CURRENT_VALUE  || u.nps_current_value  || null,
                        npsDate:      u.npsCurrentSubmissionAt || u.NPS_CURRENT_SUBMISSION_AT || u.nps_current_submission_at || null,
                        experience:   u.userAutomationExperience || u.USER_AUTOMATION_EXPERIENCE || u.user_automation_experience || null,
                        goal:         u.userGoal     || u.USER_GOAL    || u.user_goal    || null,
                        jobRole:      u.userJobRole  || u.USER_JOB_ROLE || u.user_job_role || null,
                        persona:      u.userPersona  || u.USER_PERSONA || u.user_persona || null,
                        hasRouter:       isTrue(u.hasUsedRouter) || isTrue(u.HAS_USED_ROUTER) || isTrue(u.has_used_router),
                        hasJson:         isTrue(u.hasUsedJson) || isTrue(u.HAS_USED_JSON) || isTrue(u.has_used_json),
                        hasErrorHandler: isTrue(u.hasUsedErrorHandler) || isTrue(u.HAS_USED_ERROR_HANDLER) || isTrue(u.has_used_error_handler),
                        hasWebhook:      isTrue(u.hasActiveWebhook) || isTrue(u.HAS_ACTIVE_WEBHOOK) || isTrue(u.has_active_webhook),
                        courses:      parseAgg(u.coursesCompleted || u.COURSES_COMPLETED || u.courses_completed || u.coursesArray),
                        badges:       parseAgg(u.badgesEarned     || u.BADGES_EARNED     || u.badges_earned    || u.badgesArray),
                        coursesCount: Number(u.coursesCompletedCount || u.COURSES_COMPLETED_COUNT || u.courses_completed_count) || 0,
                        lastCourseAt: u.lastCourseCompletedAt || u.LAST_COURSE_COMPLETED_AT || u.last_course_completed_at || null,
                    });
                });
            })(),

            expansionLevel: expansionLevel,
            urgencyLevel:   urgency.level,
            urgencyDetails: urgency.details,

            agent_payload_string: JSON.stringify(agentPayload),
            activeFunctions: activeFunctions,

        });
    }
  }
  return transformedItems;
}

const accountsArray = (accountData && accountData.sfdcResults)
    ? accountData.sfdcResults
    : (Array.isArray(accountData) ? accountData : [accountData]);

return transformOpportunities(accountsArray);
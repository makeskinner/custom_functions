// Build Org ID list for Snowflake + Account ID list for lifecycle query
// Runs after the Array Aggregator has collected all paginated account bundles.
//
// Outputs:
//   orgIdList     — comma-separated quoted Snowflake org IDs ('m_XXXX', ...)
//   accountIdList — comma-separated quoted SFDC account IDs ('001...', ...)
//   count         — number of accounts processed

const accounts = Array.isArray(input.accounts) ? input.accounts : [input.accounts];

const orgIds     = [];
const accountIds = [];

accounts.forEach(item => {
    const account = item.sfdcResults || item.SalesforceBundle || item;
    if (!account) return;

    // Collect SFDC Account ID for lifecycle query
    const accountId = account.Id;
    if (accountId && !accountIds.includes(accountId)) {
        accountIds.push(accountId);
    }

    // Collect org IDs for Snowflake (still read from lifecycle subquery for now)
    const lc = account.Make_LifeCycles__r;
    if (!lc) return;
    const records = lc.records || (Array.isArray(lc) ? lc : [lc]);
    records.forEach(r => {
        const orgId = r && r.imt_Make_OrgId__c;
        if (orgId && !orgIds.includes(String(orgId))) {
            orgIds.push(String(orgId));
        }
    });
});

const orgIdList = orgIds.length > 0
    ? orgIds.map(id => `'m_${id}'`).join(',')
    : null;

const accountIdList = accountIds.length > 0
    ? accountIds.map(id => `'${id}'`).join(',')
    : null;

return { orgIdList, accountIdList, count: accountIds.length };

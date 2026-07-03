// Build Account ID list for the lifecycle SOQL query.
// Runs after the Array Aggregator has collected all paginated account bundles.
// Note: orgIdList is now built inside veTracker.js from the lifecycle records.
//
// Outputs:
//   accountIdList — comma-separated quoted SFDC account IDs ('001...', ...)
//   count         — number of accounts processed

const accounts = Array.isArray(input.accounts) ? input.accounts : [input.accounts];

const accountIds = [];

accounts.forEach(item => {
    const account = item.sfdcResults || item.SalesforceBundle || item;
    if (!account) return;
    const accountId = account.Id;
    if (accountId && !accountIds.includes(accountId)) {
        accountIds.push(accountId);
    }
});

const accountIdList = accountIds.length > 0
    ? accountIds.map(id => `'${id}'`).join(',')
    : null;

return { accountIdList, count: accountIds.length };

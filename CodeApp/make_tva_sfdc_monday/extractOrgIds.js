// Extract Snowflake org IDs from lifecycle records.
// Runs AFTER the lifecycle SFDC query, feeds orgIdList into the Snowflake queries.
//
// Outputs:
//   orgIdList — comma-separated quoted Snowflake org IDs ('m_XXXX', ...)
//   count     — number of unique orgs found

const records = Array.isArray(input.lifecycleRecords)
    ? input.lifecycleRecords
    : [];

const orgIds = [];
records.forEach(r => {
    const orgId = r && r.imt_Make_OrgId__c;
    if (orgId && !orgIds.includes(String(orgId))) {
        orgIds.push(String(orgId));
    }
});

const orgIdList = orgIds.length > 0
    ? orgIds.map(id => `'m_${id}'`).join(',')
    : null;

return { orgIdList, count: orgIds.length };

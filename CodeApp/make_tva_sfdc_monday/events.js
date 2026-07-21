const rawEvents = input.sfdcEvents;

function extractRecords(data) {
    if (!data) return [];
    if (Array.isArray(data)) {
        if (data[0] && data[0].records) return data.flatMap(d => d.records || []);
        return data;
    }
    if (data.records) return data.records;
    return [];
}

const records = extractRecords(rawEvents);
const get = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

// Group events by their parent ID to match the webhook's bulk array format
const groupedEvents = {};

records.forEach(event => {
    // FIX 1: Strictly use AccountId so it perfectly matches the PostgreSQL Account table
    const parentId = get(event, 'AccountId');
    if (!parentId) return; 

    const eDateStr = get(event, 'Activity_Date__c');
    const eType = get(event, 'Activity_Type__c', '');
    const eDelivered = get(event, 'Delivered__c', 'No');

    const formattedEvent = {
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
        contactName:        get(event, 'Who.Name') || get(event, 'Who.Email'),
        contactEmail:       get(event, 'Who.Email'),
        approvalStatus:     get(event, 'Approval_Status__c'),
        rejectionCount:     get(event, 'Rejection_Count__c'),
        rejectedComments:   get(event, 'Rejected_Comments__c'),
        rescheduled:        get(event, 'Rescheduled__c') === true || get(event, 'Rescheduled__c') === 'true',
        assigned:           get(event, 'Owner.Name'),
        
        // FIX 2: Attach firmographics natively for cross-account workshops
        company_name:       event.Account ? event.Account.Name : null,
        lead_ve:            (event.Account && event.Account.imt_Make_Lead_VE__r) ? event.Account.imt_Make_Lead_VE__r.Name : null
    };

    if (!groupedEvents[parentId]) groupedEvents[parentId] = [];
    groupedEvents[parentId].push(formattedEvent);
});

// FIX 3: Change the output key from oppId to accountId to match the new backend schema
const finalOutput = Object.keys(groupedEvents).map(parentId => ({
    accountId: parentId, 
    recentEvents: groupedEvents[parentId]
}));

return finalOutput;
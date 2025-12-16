// Testing Data Only - Remove for Production
const accountData = [
    {
        "Id": "0010700000VsNlEAAV",
        "Name": "Ceedbox",
        "Integromat_Owner__r": {
            "Name": "Chi-Han Cheng"
        },
        "imt_Make_BDR__r": null,
        "imt_Make_Lead_VE__r": {
            "Name": "Mark Skinner"
        },
        "Make_Expansion_Score_RollUp__c": 0.68,
        "Opportunities": {
            "totalSize": 1,
            "done": true,
            "records": [
                {
                    "Name": "Ceedbox - Auto Renewal SVIV2023030696 - April 3, 2026",
                    "AccountId": "0010700000VsNlEAAV",
                    "Account_Industry__c": "Information Technology",
                    "Next_Step__c": "2025-04-30 MS: Error Handling workshop Part 2 Next week\r\n2.10.2024-FK: Organize handover (potentially)",
                    "CloseDate": "2026-04-02T22:00:00.000Z",
                    "Customer_Type__c": "Existing Customer",
                    "StageName": "Negotiation",
                    "Description": null,
                    "CreatedDate": "2023-03-14T17:06:59.000Z",
                    "AmountConvertedUSD__c": 24798.51,
                    "Close_FIscal_Year__c": 2027,
                    "FiscalQuarter": 1,
                    "Owner": {
                        "Name": "Chi-Han Cheng"
                    },
                    "Id": "00607000009Hk4FAAS",
                    "Opportunity_Link__c": "https://celonis.lightning.force.com/00607000009Hk4FAAS",
                    "Type": "Expand",
                    "Executive_Summary__c": "#VECurrentFocusMS\r\n2025-04-30 MS: Happy CTO (Alex) - good relationship. Expecting more scenarios soon\r\n2.10.2024-FK: Hanover new CSM pending",
                    "imt_Tech_Risks_Gaps__c": "2025-04-30 MS: Lack of knowledge & stakeholders",
                    "imt_ICP_Category__c": null,
                    "imt_Drive_Folder_Link__c": null,
                    "imt_Notes__c": null,
                    "imt_Estimated_Production_Timeline__c": null,
                    "imt_Pre_Sales_Next_Steps__c": "2025-04-30 MS: Technical workshop completed today. Error handling. CTO and 2x developers joined",
                    "imt_Pre_Sales_confidence_for_Quarter__c": "High",
                    "imt_Churn_Risk__c": "LOW",
                    "imt_Make_Estimated_Churn_Value__c": 6199.63
                }
            ]
        },
        "Events": {
            "totalSize": 2,
            "done": true,
            "records": [
                {
                    "Id": "00Uck000000d8AcEAI",
                    "Subject": "Workshop: Optimization",
                    "Location": "Virtual",
                    "StartDateTime": "2025-09-25T14:00:00.000Z",
                    "EndDateTime": "2025-09-25T15:45:00.000Z",
                    "Description": "Alex requested an optimization & best practises workshop. He was concerned about consumption and exceeding his contracted quota.",
                    "Owner": {
                        "Name": "Mark Skinner"
                    },
                    "Activity_Type__c": "Workshop",
                    "Approval_Status__c": "Approved",
                    "Assiged_to_Name__c": "Mark Skinner",
                    "Email_of_BDR__c": "m.skinner@make.com",
                    "Delivered__c": "Yes",
                    "Type": "Workshop",
                    "DurationInMinutes": 105,
                    "Related_Account__r": {
                        "Name": "Ceedbox"
                    }
                },
                {
                    "Id": "00Uck000000fzabEAA",
                    "Subject": "Workshop: Custom On-Demand",
                    "Location": "On-site",
                    "StartDateTime": "2025-10-27T09:00:00.000Z",
                    "EndDateTime": "2025-10-27T14:00:00.000Z",
                    "Description": "Ceedbox requested a workshop to cover:\r\n1. Optimization methods\r\n2. Best practises\r\n3. Operational Excellence\r\n\r\nI put this under \"Custom\" rather than creating 3 individual workshops.",
                    "Owner": {
                        "Name": "Mark Skinner"
                    },
                    "Activity_Type__c": "Workshop",
                    "Approval_Status__c": "Approved",
                    "Assiged_to_Name__c": "Mark Skinner",
                    "Email_of_BDR__c": "m.skinner@make.com",
                    "Delivered__c": "No",
                    "Type": "Workshop",
                    "DurationInMinutes": 300,
                    "Related_Account__r": {
                        "Name": "Ceedbox"
                    }
                }
            ]
        },
        "__IMTLENGTH__": 1,
        "__IMTINDEX__": 1
    }
];


// The `input` object is provided by Make. We access the `inputData` property,
// which contains the single Salesforce account object for this run.
// const accountData = input.inputData;

/**
 * Parses and transforms account and opportunity data.
 * The function is designed to work with an array of accounts.
 *
 * @param {Array<Object>} accountsArray An array containing one or more account objects.
 * @returns {Array<Object>} An array of transformed opportunity objects.
 */
function transformOpportunities(accountsArray) {
  // Check if the input is a valid, non-empty array
  if (!Array.isArray(accountsArray) || accountsArray.length === 0) {
    console.log("Input to function was not a valid array or was empty.");
    return [];
  }

  const transformedItems = [];

  // Helper function to safely access nested properties
  const get = (obj, path, defaultValue = null) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj);
    return (value !== undefined && value !== null) ? value : defaultValue;
  };

  // Loop through the accounts (in this case, there's only one)
  for (const account of accountsArray) {
    const opportunities = get(account, 'Opportunities.records', []);
    if (!Array.isArray(opportunities) || opportunities.length === 0) {
      continue;
    }

    const eventsRaw = get(account, 'Events.records', []);
    
    const mappedEvents = Array.isArray(eventsRaw) ? eventsRaw.map(event => ({
      eventId: get(event, 'Id'),
      subject: get(event, 'Subject'),
      ownerName: get(event, 'Owner.Name'),
      startDate: get(event, 'StartDateTime'),
      endDate: get(event, 'EndDateTime'),
      location: get(event, 'Location'),
      description: get(event, 'Description'),
      activityType: get(event, 'Activity_Type__c'),
      approvalStatus: get(event, 'Approval_Status__c'),
      assignedToName: get(event, 'Assiged_to_Name__c'),
      bdrEmail: get(event, 'Email_of_BDR__c'),
      delivered: get(event, 'Delivered__c'),
      type: get(event, 'Type'),
      durationInMinutes: get(event, 'DurationInMinutes'),
    })) : [];

    for (const opportunity of opportunities) {
      // --- COMBINED LOGIC IS HERE ---
      const customerType = get(opportunity, 'Customer_Type__c');
      const stageName = get(opportunity, 'StageName');
      
      // Condition 1: Must be an existing customer.
      const isExistingCustomer = customerType === 'Existing Customer';
      
      // Condition 2: Must not be a closed stage.
      const closedStages = ['Closed Won', 'Closed Lost'];
      const isClosed = closedStages.includes(stageName);

      const transformedItem = {
        sourceId: get(opportunity, 'Id'),
        sourceType: 'Opportunity',
        itemName: get(opportunity, 'Name'),
        stageName: stageName,
        companyName: get(account, 'Name'),
        expansionScore: get(account, 'Make_Expansion_Score_RollUp__c'),
        primaryContactName: get(account, 'Integromat_Owner__r.Name'),
        assignedToName: get(opportunity, 'Owner.Name', 'Mark Skinner'),
        leadVeName: get(account, 'imt_Make_Lead_VE__r.Name'),
        execSummary: get(opportunity, 'Executive_Summary__c'),
        amNextSteps: get(opportunity, 'Next_Step__c'),
        preSalesNextSteps: get(opportunity, 'imt_Pre_Sales_Next_Steps__c'),
        preSalesConfidence: get(opportunity, 'imt_Pre_Sales_confidence_for_Quarter__c'),
        churnRisk: get(opportunity, 'imt_Churn_Risk__c'),
        churnValue: get(opportunity, 'imt_Make_Estimated_Churn_Value__c'),
        linkUrl: get(opportunity, 'Opportunity_Link__c'),
        linkText: get(opportunity, 'Id'),
        urgency: null,
        expectedRevenue: get(opportunity, 'AmountConvertedUSD__c'),
        fiscalQuarter: get(opportunity, 'FiscalQuarter'),
        fiscalYear: get(opportunity, 'Close_FIscal_Year__c'),
        timeline: [{
          from: get(opportunity, 'CreatedDate'),
          to: get(opportunity, 'CloseDate'),
        }],
        'Type': get(opportunity, 'Type'),
        'Estimated Production Timeline': get(opportunity, 'imt_Estimated_Production_Timeline__c'),
        'Customer Type': customerType,
        // Add events only if BOTH conditions are true (is an existing customer AND is not closed).
        events: (isExistingCustomer && !isClosed) ? mappedEvents : [],
      };
      transformedItems.push(transformedItem);
    }
  }

  return transformedItems;
}

// The transform function expects an array, so we wrap our single account object in one.
const result = transformOpportunities(accountData);

// Testing ONLY - Remove in Production
// Logging the final output for debugging
console.log("Successfully extracted values:", result);

// Return the final array of transformed opportunities.
// Make will output each object in the array as a separate bundle.
return result;
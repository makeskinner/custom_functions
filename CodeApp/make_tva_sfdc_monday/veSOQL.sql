SELECT
   Id,
   Name,
   Integromat_Owner__r.Name,
   imt_Make_Lead_VE__r.Manager.Name,
   imt_Make_BDR__r.Name,
   imt_Make_Lead_VE__r.Name,
   Make_Expansion_Score_RollUp__c,
   Integromat_ARR_USD__c,
   Next_Renewal_Date__c,
   imt_Company_Size__c,
   BillingCountry,
   BillingCountryCode,
   (
     SELECT
         Id, 
         Name, 
         StageName, 
         AmountConvertedUSD__c, 
         CloseDate, 
         CreatedDate, 
         Opportunity_Link__c, 
         Type, 
         imt_Churn_Risk__c, 
         Executive_Summary__c, 
         imt_Notes__c, 
         Next_Step__c, 
         imt_Tech_Risks_Gaps__c, 
         RecordType.Name,
         imt_Churn_Status__c, 
         imt_Churn_Reason__c, 
         imt_Make_Estimated_Churn_Value__c,
         imt_Pre_Sales_Next_Steps__c,
         imt_Pre_Sales_confidence_for_Quarter__c,
         imt_Churn_Request_Details__c,
         Renewal_Type__c,
         RecordType.DeveloperName
     FROM
         Opportunities 
     WHERE
         RecordType.DeveloperName IN ('O02', 'O04')
         AND (
             (IsClosed = false AND StageName NOT IN ('Rejected', 'Profile'))
             OR
             (StageName = 'Closed Won' AND RecordType.DeveloperName = 'O04'
              AND CloseDate >= {{103.fyrenewalwindowstart}})
             OR
             (StageName = 'Closed Lost'
              AND CloseDate >= {{103.fyrenewalwindowstart}}
              AND CloseDate <= {{103.fyrenewalwindowend}})
         )
     ORDER BY
         AmountConvertedUSD__c DESC 
   ),
   (
      SELECT
         Id,
         Subject,
         StartDateTime,
         EndDateTime,
         Activity_Type__c,
         Activity_Date__c,
         Delivered__c,
         Delivered_Date__c,
         DurationInMinutes,
         Location,
         Approval_Status__c,
         Rejection_Count__c,
         Rejected_Comments__c,
         Owner.Name,
         TYPEOF Who
             WHEN Contact THEN Name, Email
             WHEN Lead THEN Name, Email
         END
      FROM
         Events 
      WHERE
         Activity_Date__c >= {{formatDate(addMonths(now; -12); "YYYY-MM-DD")}}
         AND Activity_Date__c <= {{formatDate(addDays(now; 60); "YYYY-MM-DD")}}
   )
FROM
   Account 
WHERE imt_Make_Lead_VE__c = '{{135.Id}}'
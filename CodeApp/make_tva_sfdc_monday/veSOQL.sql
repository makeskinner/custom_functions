SELECT
   Id,
   Name,
   Integromat_Owner__r.Name,
   imt_Make_Lead_VE__r.Manager.Name,
   imt_Make_Lead_VE__r.Manager.Email,
   imt_Make_BDR__r.Name,
   imt_Make_Lead_VE__r.Name,
   imt_Make_Lead_VE__r.Email,
   Make_Expansion_Score_RollUp__c,
   Integromat_ARR_USD__c,
   Next_Renewal_Date__c,
   imt_Company_Size__c,
   BillingCountry,
   BillingCountryCode,
   Industry,
   Annual_Revenue_USD__c,
   Revenue_Bands__c,
   Account_Priority__c,
   Referenceable_legal__c,
   safebase__Account_Share_Link__c,
   imt_AI_Mandate_Likelihood__c,
   imt_AI_Likelihood_Explanation__c,
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
         RecordType.DeveloperName,
         Celonis_Business_Unit__c
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
         AND Celonis_Business_Unit__c = 'Integromat/Make'
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
         Rescheduled__c,
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
   ),
   (
      SELECT
         Id,
         xbeamprod__Partner_Name__c,
         xbeamprod__Partner_Standard_Populations__c,
         xbeamprod__Standard_Populations__c
      FROM
         xbeamprod__Overlaps__r
   )
FROM
   Account 
WHERE imt_Make_Lead_VE__c = '{{197.Id}}'
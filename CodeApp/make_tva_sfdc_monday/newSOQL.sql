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
         Celonis_Business_Unit__c = 'Integromat/Make'
         AND RecordType.DeveloperName IN ('O02', 'O04')
         AND IsClosed = false
         AND StageName NOT IN ('Rejected', 'Profile', 'Closed Lost', 'Closed Won')
     ORDER BY
         AmountConvertedUSD__c DESC 
   ),
   (
      SELECT
         Id,
         imt_Make_OrgId__c,
         imt_Org_Plan__c,
         imt_Usage_Score__c,
         imt_Org_Ops_In_Plan__c,
         imt_Org_Ops_Left_In_Plan__c,
         imt_Org_Ops_Left_In_Plan_w_Extra__c,
         imt_Org_Extra_Ops_In_Plan__c,
         imt_Exp_Consumption_End_Val_Period__c,
         List_of_Apps_Used__c,
         imt_FDESK_Company_URL__c,
         imt_Org_Active_Scenarios_Curr_Month__c,
         imt_Org_Active_Scenarios_Prev_Month__c,
         imt_Org_Nb_Teams_Current_Month__c,
         imt_Org_Nb_Teams_Previous_Month__c,
         imt_Org_Nb_Users_Curr_Month__c,
         imt_Org_Nb_Users_Prev_Month__c,
         imt_Org_Nb_Active_Users_Curr_Month__c,
         imt_Org_Ops_Consumed_Last_30d__c,
         imt_Org_Ops_Consumed_Prev_Month__c,
         imt_Org_Ops_Consumed_Curr_Month__c,
         Contract_Duration__c,
         Expansion_Potential__c,
         Sum_Renewal_Amount__c,
         CSAT_Average__c,
         CSAT_Count__c,
         HealthScore_Average__c,
         HealthScore_Count__c,
         NPS_Average__c,
         NPS_Count__c,
         Nb_of_Open_Tickets__c,
         Nb_of_Tickets__c,
         imt_Org_Zone_Name__c
      FROM
         Make_LifeCycles__r 
      WHERE
         imt_Org_Plan__c = 'Enterprise' 
         AND imt_Make_OrgId__c != null 
      ORDER BY
         imt_Usage_Score__c DESC LIMIT 1 
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
WHERE Id IN (
    SELECT AccountId 
    FROM Opportunity 
    WHERE Celonis_Business_Unit__c = 'Integromat/Make'
    AND RecordType.DeveloperName IN ('O02', 'O04')
    AND IsClosed = false
    AND StageName NOT IN ('Rejected', 'Profile')
)
AND imt_Make_Lead_VE__c IN (
    '00507000003ydG8AAI',
    '00507000000gmN7AAI',
    '005S70000049hMoIAI',
    '00507000000hh37AAA',
    '005ck00000J5WNkAAN',
    '005ck000008XRkoAAG',
    '005ck00000Kel1zAAB',
    '00507000004S3rRAAS'
)
LIMIT 2100

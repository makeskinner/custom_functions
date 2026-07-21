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
    Owner.Id,
    Owner.Email,
    AccountId,
    Account.Name,
    Account.imt_Make_Lead_VE__r.Name,
    TYPEOF Who
        WHEN Contact THEN Name, Email
        WHEN Lead THEN Name, Email
    END
FROM
    Event 
WHERE
    Activity_Date__c >= {{formatDate(addMonths(now; -6); "YYYY-MM-DD")}}
    AND Activity_Date__c <= {{formatDate(addDays(now; 60); "YYYY-MM-DD")}}
    AND Owner.Email = '{{9.Email}}'
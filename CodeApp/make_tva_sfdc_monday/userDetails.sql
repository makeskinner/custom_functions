SELECT 
    ou.org_id,
    suc.user_id,
    suc.nps_current_value,
    suc.nps_current_submission_at,
    suc.user_automation_experience,
    suc.user_goal,
    suc.user_job_role,
    suc.user_persona,
    suc.has_active_webhook,
    suc.has_used_error_handler,
    suc.has_used_json,
    suc.has_used_router,
    ARRAY_AGG(DISTINCT ac.course_name) WITHIN GROUP (ORDER BY ac.course_name) AS courses_completed,
    ARRAY_AGG(DISTINCT ab.badge_name) WITHIN GROUP (ORDER BY ab.badge_name) AS badges_earned,
    COUNT(DISTINCT CASE WHEN ae.enrollment_completed_at_utc IS NOT NULL THEN ae.course_id END) AS courses_completed_count,
    MAX(ae.enrollment_completed_at_utc) AS last_course_completed_at
FROM dwh.brg_organization_user AS ou
JOIN dwh.dim_user AS du ON ou.user_id = du.user_id AND du.is_last_version = 1
JOIN SERVING.SRV_USER_CURRENT AS suc ON ou.user_id = suc.user_id
LEFT JOIN dwh.dim_academy_enrollment AS ae ON ou.user_id = ae.user_id AND ae.is_last_version = 1
LEFT JOIN dwh.dim_academy_course AS ac ON ae.course_id = ac.course_id AND ac.is_last_version = 1
LEFT JOIN dwh.dim_academy_badge AS ab ON ae.badge_template_id = ab.badge_template_id AND ab.is_last_version = 1
WHERE ou.org_id IN ({{177.result.orgIdList}})
    AND suc.is_deleted = 0
    AND suc.is_internal_account = 0
    AND ou.is_last_version = 1
    AND suc.is_invalid = 0
GROUP BY ou.org_id, suc.user_id, suc.nps_current_value, suc.nps_current_submission_at,
    suc.user_automation_experience, suc.user_goal, suc.user_job_role, suc.user_persona,
    suc.has_active_webhook, suc.has_used_error_handler, suc.has_used_json, suc.has_used_router
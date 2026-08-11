-- Stage 11 Cluster C — remove manual "overall" budget rows
--
-- overallBudget is now auto-computed as SUM of all category budgets for the
-- active scope. The category_id = null pattern is no longer used; these rows
-- are obsolete and are deleted here.

delete from budgets where category_id is null;

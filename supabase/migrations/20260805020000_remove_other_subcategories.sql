-- Remove "Other" subcategories from Housing and Transport groups.
-- The standalone "Other" leaf category remains.
-- Any transactions linked to these subcategories become uncategorised (ON DELETE SET NULL).
delete from categories
  where name = 'Other'
    and parent_id is not null
    and is_default = true
    and group_id is null;

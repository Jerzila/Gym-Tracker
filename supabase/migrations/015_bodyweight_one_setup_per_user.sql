-- At most one setup-sourced bodyweight log per user (stops parallel-request duplicates).

-- Keep earliest row per user among source = 'setup'; drop the rest.
DELETE FROM public.bodyweight_logs l
WHERE l.source = 'setup'
  AND l.id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS rn
      FROM public.bodyweight_logs
      WHERE source = 'setup'
    ) sub
    WHERE sub.rn > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS bodyweight_logs_one_setup_per_user
  ON public.bodyweight_logs (user_id)
  WHERE (source = 'setup');

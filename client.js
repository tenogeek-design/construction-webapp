
-- Проверяем поля заявок
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'requests'
ORDER BY ordinal_position;

-- Проверяем политики доступа
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'requests';

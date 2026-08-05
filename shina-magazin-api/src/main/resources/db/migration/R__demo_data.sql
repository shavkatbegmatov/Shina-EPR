-- Legacy compatibility marker.
--
-- Demo data was formerly a repeatable Flyway migration in classpath:db/demo.
-- Keeping the same repeatable migration name in the standard location lets
-- existing databases validate and records the retirement checksum, while new
-- databases receive no automatic demo business data.
--
-- Demo generation is now explicitly managed by:
--   POST /v1/settings/demo-data
--   DELETE /v1/settings/demo-data

SELECT 1;

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the send-reminders function to run every 5 minutes
SELECT cron.schedule(
  'send-reminders-every-5-minutes',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://fontsvmexlkwqgbfrwtl.supabase.co/functions/v1/send-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbnRzdm1leGxrd3FnYmZyd3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDk5MjQsImV4cCI6MjA3NDc4NTkyNH0.BJp257he7xMmNLFE6LPMrTHiDJHYjoIJtbCnf2sfZJw"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
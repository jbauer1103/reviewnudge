-- Run the send-follow-ups server function at 17 minutes past every hour.
-- It uses the app's public (publishable) key, which is safe to keep here.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-follow-ups',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://zfoeuyihhiuyirbvifhq.supabase.co/functions/v1/send-follow-ups',
    headers := jsonb_build_object('apikey', 'sb_publishable_PRz8eRnTAizjkIeGTfLkYA_uuk9YGU-', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

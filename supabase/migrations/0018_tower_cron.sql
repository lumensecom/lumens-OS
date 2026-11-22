create extension if not exists pg_cron;
select cron.schedule(
  'lumens-tower-minute',
  '* * * * *',
  $job$select tower_private.tick();$job$
);

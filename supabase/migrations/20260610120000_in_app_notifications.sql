-- Allow in-app notifications (e.g. price negotiations shown in the admin
-- dashboard) alongside the delivery channels.
alter table public.notification_logs
  drop constraint if exists notification_logs_channel_check;
alter table public.notification_logs
  add constraint notification_logs_channel_check
  check (channel in ('sms', 'whatsapp', 'email', 'in_app'));

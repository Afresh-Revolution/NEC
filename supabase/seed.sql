insert into public.chapters (state_code, state_name, is_active)
values
  ('ABJ', 'Federal Capital Territory', false),
  ('ADA', 'Adamawa', false),
  ('BAU', 'Bauchi', false),
  ('BOR', 'Borno', false),
  ('BEN', 'Benue', false),
  ('GOM', 'Gombe', false),
  ('JIG', 'Jigawa', false),
  ('KAD', 'Kaduna', false),
  ('KAN', 'Kano', false),
  ('KAT', 'Katsina', false),
  ('KEB', 'Kebbi', false),
  ('KOG', 'Kogi', false),
  ('KWA', 'Kwara', false),
  ('NAS', 'Nasarawa', false),
  ('NIG', 'Niger', false),
  ('PLA', 'Plateau', false),
  ('TAR', 'Taraba', false),
  ('SOK', 'Sokoto', false),
  ('ZAM', 'Zamfara', false),
  ('YOB', 'Yobe', false)
on conflict (state_code) do nothing;

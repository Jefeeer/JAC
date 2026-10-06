-- =============================================================================
-- JAC Motors — Storage buckets + object policies
--
--   truck-images  public   listing photos (admin / sales write)
--   part-images   public   catalog photos (admin / parts write)
--   uploads       private  customer photos for bookings + quotes
--                          portal users:  {auth.uid()}/…
--                          public forms:  public/{uuid}/…  (written by the server w/ service role)
--   documents     private  generated PDFs (quotes, invoices)
--                          customers/{customer_id}/{quotes|invoices}/{reference}.pdf
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('truck-images', 'truck-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('part-images',  'part-images',  true,  5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('uploads',      'uploads',      false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']),
  ('documents',    'documents',    false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------- truck-images
create policy "truck-images: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'truck-images');
create policy "truck-images: admin/sales insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'truck-images' and (select public.has_role('admin', 'sales')));
create policy "truck-images: admin/sales update" on storage.objects
  for update to authenticated
  using (bucket_id = 'truck-images' and (select public.has_role('admin', 'sales')))
  with check (bucket_id = 'truck-images' and (select public.has_role('admin', 'sales')));
create policy "truck-images: admin/sales delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'truck-images' and (select public.has_role('admin', 'sales')));

-- ----------------------------------------------------------------- part-images
create policy "part-images: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'part-images');
create policy "part-images: admin/parts insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'part-images' and (select public.has_role('admin', 'parts')));
create policy "part-images: admin/parts update" on storage.objects
  for update to authenticated
  using (bucket_id = 'part-images' and (select public.has_role('admin', 'parts')))
  with check (bucket_id = 'part-images' and (select public.has_role('admin', 'parts')));
create policy "part-images: admin/parts delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'part-images' and (select public.has_role('admin', 'parts')));

-- --------------------------------------------------------------------- uploads
create policy "uploads: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (select public.is_staff()));

-- ------------------------------------------------------------------- documents
create policy "documents: customer read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = 'customers'
    and (storage.foldername(name))[2] in (select id::text from public.my_customer_ids() as id)
  );
create policy "documents: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (select public.is_staff()));
-- writes happen from the Python service with the service role (bypasses RLS)

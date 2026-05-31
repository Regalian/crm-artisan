-- Optimize RLS policies by wrapping auth.uid() in SELECT so Postgres can
-- evaluate it once per statement instead of once per row.

ALTER POLICY "Users can view their own clients"
ON public.clients
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can insert their own clients"
ON public.clients
WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can update their own clients"
ON public.clients
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can delete their own clients"
ON public.clients
USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own job sites"
ON public.job_sites
USING (
  (SELECT auth.uid()) = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

ALTER POLICY "Users can insert their own job sites"
ON public.job_sites
WITH CHECK (
  (SELECT auth.uid()) = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

ALTER POLICY "Users can update their own job sites"
ON public.job_sites
USING (
  (SELECT auth.uid()) = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

ALTER POLICY "Users can delete their own job sites"
ON public.job_sites
USING (
  (SELECT auth.uid()) = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

ALTER POLICY "Users can view their own quotes"
ON public.quotes
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

ALTER POLICY "Users can insert their own quotes"
ON public.quotes
WITH CHECK (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

ALTER POLICY "Users can update their own quotes"
ON public.quotes
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

ALTER POLICY "Users can delete their own quotes"
ON public.quotes
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

ALTER POLICY "Users can view their own line items"
ON public.quote_line_items
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

ALTER POLICY "Users can insert their own line items"
ON public.quote_line_items
WITH CHECK (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

ALTER POLICY "Users can update their own line items"
ON public.quote_line_items
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

ALTER POLICY "Users can delete their own line items"
ON public.quote_line_items
USING (
  (SELECT auth.uid()) = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

ALTER POLICY "Users can view their own profile"
ON public.profiles
USING ((SELECT auth.uid()) = id);

ALTER POLICY "Users can update their own profile"
ON public.profiles
USING ((SELECT auth.uid()) = id);

ALTER POLICY "Users can insert their own profile"
ON public.profiles
WITH CHECK ((SELECT auth.uid()) = id);

ALTER POLICY "Users can view their own activity"
ON public.activity_log
USING ((SELECT auth.uid()) = user_id);

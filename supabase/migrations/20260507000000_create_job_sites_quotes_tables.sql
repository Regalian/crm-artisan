-- Job Sites table
CREATE TABLE public.job_sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job sites" ON public.job_sites FOR SELECT USING (
  auth.uid() = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

CREATE POLICY "Users can insert their own job sites" ON public.job_sites FOR INSERT WITH CHECK (
  auth.uid() = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

CREATE POLICY "Users can update their own job sites" ON public.job_sites FOR UPDATE USING (
  auth.uid() = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

CREATE POLICY "Users can delete their own job sites" ON public.job_sites FOR DELETE USING (
  auth.uid() = (
    SELECT user_id FROM public.clients WHERE id = job_sites.client_id
  )
);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_site_id UUID NOT NULL REFERENCES public.job_sites(id) ON DELETE RESTRICT,
  quote_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

CREATE POLICY "Users can insert their own quotes" ON public.quotes FOR INSERT WITH CHECK (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

CREATE POLICY "Users can update their own quotes" ON public.quotes FOR UPDATE USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

CREATE POLICY "Users can delete their own quotes" ON public.quotes FOR DELETE USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    WHERE js.id = quotes.job_site_id
  )
);

-- Quote line items table
CREATE TABLE public.quote_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own line items" ON public.quote_line_items FOR SELECT USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

CREATE POLICY "Users can insert their own line items" ON public.quote_line_items FOR INSERT WITH CHECK (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

CREATE POLICY "Users can update their own line items" ON public.quote_line_items FOR UPDATE USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

CREATE POLICY "Users can delete their own line items" ON public.quote_line_items FOR DELETE USING (
  auth.uid() = (
    SELECT c.user_id FROM public.clients c
    JOIN public.job_sites js ON js.client_id = c.id
    JOIN public.quotes q ON q.job_site_id = js.id
    WHERE q.id = quote_line_items.quote_id
  )
);

-- Trigger for updated_at on job_sites
CREATE TRIGGER set_job_sites_updated_at
BEFORE UPDATE ON public.job_sites
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on quotes
CREATE TRIGGER set_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate next quote number for a job site
CREATE OR REPLACE FUNCTION public.get_next_quote_number(p_job_site_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_max_num INTEGER;
  v_client_prefix TEXT;
BEGIN
  -- Get client name first 2 chars for prefix
  SELECT SUBSTRING(c.name, 1, 2)::TEXT
  INTO v_client_prefix
  FROM public.clients c
  JOIN public.job_sites js ON js.client_id = c.id
  WHERE js.id = p_job_site_id;
  
  v_client_prefix := UPPER(COALESCE(v_client_prefix, 'XX'));
  
  -- Find max quote number for this job site
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number, POSITION('-' IN quote_number) + 1) AS INTEGER)
  ), 0)
  INTO v_max_num
  FROM public.quotes
  WHERE job_site_id = p_job_site_id;
  
  RETURN v_client_prefix || '-' || LPAD((v_max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

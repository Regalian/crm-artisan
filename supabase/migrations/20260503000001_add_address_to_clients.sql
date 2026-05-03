-- Add address field to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for potential address-based queries
CREATE INDEX IF NOT EXISTS idx_clients_address ON public.clients(address);
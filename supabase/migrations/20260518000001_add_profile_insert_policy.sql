-- Allow users to insert their own profile row
-- (The signup trigger handles this automatically, but this policy
--  makes it explicit so direct inserts from client code work too)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

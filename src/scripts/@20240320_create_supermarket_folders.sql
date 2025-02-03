-- Create the supermarket_folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS supermarket_folders (
  id TEXT PRIMARY KEY,
  supermarket TEXT NOT NULL,
  title TEXT,
  pdf_url TEXT NOT NULL,
  local_path TEXT,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE supermarket_folders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON supermarket_folders;
DROP POLICY IF EXISTS "Enable insert for service role" ON supermarket_folders;
DROP POLICY IF EXISTS "Enable update for service role" ON supermarket_folders;
DROP POLICY IF EXISTS "Enable delete for service role" ON supermarket_folders;

-- Create policies
CREATE POLICY "Enable read access for all users" 
ON supermarket_folders FOR SELECT 
USING (true);

-- Allow all operations for service role
CREATE POLICY "Enable all operations for service role" 
ON supermarket_folders 
FOR ALL 
USING (
  auth.role() = 'service_role' OR 
  auth.jwt()->>'role' = 'service_role' OR 
  (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS supermarket_folders_valid_until_idx ON supermarket_folders (valid_until);
CREATE INDEX IF NOT EXISTS supermarket_folders_supermarket_idx ON supermarket_folders (supermarket); 
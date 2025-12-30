-- Drop the old constraint that only allowed 'private' and 'shared_link'
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_privacy_check;

-- Add new constraint that allows 'private', 'public', and 'shared_link'
ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_privacy_check 
  CHECK (privacy IN ('private', 'public', 'shared_link'));

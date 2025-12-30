-- Break RLS recursion by using security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Owners can view all members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;

-- Create security definer function to check workspace ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id_param AND owner_id = auth.uid()
  );
END;
$$;

-- Recreate policies using the function (no RLS recursion)
CREATE POLICY "Owners can view all members" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR is_workspace_owner(workspace_id)
  );

CREATE POLICY "Owners can manage members" ON workspace_members
  FOR ALL USING (is_workspace_owner(workspace_id));

-- Drop the "Users can view their own memberships" policy since it's redundant
DROP POLICY IF EXISTS "Users can view their own memberships" ON workspace_members;

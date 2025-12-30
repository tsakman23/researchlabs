-- Consolidate workspace SELECT policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Members can view workspaces" ON workspaces;

CREATE POLICY "Users can view workspaces" ON workspaces 
FOR SELECT USING (
  owner_id = auth.uid() OR 
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

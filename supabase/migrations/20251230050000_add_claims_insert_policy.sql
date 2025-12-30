-- Add INSERT policy for claims
-- Users who are workspace members with editor or owner role can insert claims

CREATE POLICY "Editors and owners can create claims" ON claims
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'editor')
  )
);

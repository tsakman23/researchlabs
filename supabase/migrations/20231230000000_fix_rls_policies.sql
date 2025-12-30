-- Fix infinite recursion in RLS policies by breaking the circular dependency

-- Drop ALL policies that cause recursion
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view workspace membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view documents in their workspaces" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents in their workspaces" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their workspaces" ON public.documents;
DROP POLICY IF EXISTS "Users can delete documents in their workspaces" ON public.documents;

-- Recreate workspace policies WITHOUT referencing workspace_members
CREATE POLICY "Users can view their own workspaces" ON public.workspaces
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Members can view workspaces" ON public.workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Recreate workspace_members policies WITHOUT recursively checking workspaces
CREATE POLICY "Users can view their own memberships" ON public.workspace_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can view all members of their workspaces" ON public.workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can manage members" ON public.workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Recreate document policies
CREATE POLICY "Users can view documents in owned workspaces" ON public.documents
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members can view documents in their workspaces" ON public.documents
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create documents in owned workspaces" ON public.documents
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors can create documents" ON public.documents
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can update documents in owned workspaces" ON public.documents
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors can update documents" ON public.documents
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete documents in owned workspaces" ON public.documents
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY "Editors can delete documents" ON public.documents
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

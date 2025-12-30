-- Migration: Convert workspace IDs to UUID
-- This migration converts all workspace-related tables from BIGSERIAL to UUID

-- Use gen_random_uuid() which is built-in to PostgreSQL 13+
-- No extension needed

-- 1. Drop all policies that reference workspace_id
DROP POLICY IF EXISTS "Users can view workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can view all members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Members can view documents in their workspaces" ON documents;
DROP POLICY IF EXISTS "Editors can create documents" ON documents;
DROP POLICY IF EXISTS "Editors can update documents" ON documents;
DROP POLICY IF EXISTS "Editors can delete documents" ON documents;
DROP POLICY IF EXISTS "Users can view claims" ON claims;
DROP POLICY IF EXISTS "Users can upload documents to owned workspaces" ON storage.objects;
DROP POLICY IF EXISTS "Members can view workspace documents" ON storage.objects;
DROP POLICY IF EXISTS "Editors can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Editors can delete documents" ON storage.objects;

-- 2. Drop the security definer function that uses BIGINT
DROP FUNCTION IF EXISTS is_workspace_owner(BIGINT);

-- 3. Drop existing foreign key constraints
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_workspace_id_fkey;
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_workspace_id_fkey;
ALTER TABLE contradictions DROP CONSTRAINT IF EXISTS contradictions_workspace_id_fkey;
ALTER TABLE collaborative_documents DROP CONSTRAINT IF EXISTS collaborative_documents_workspace_id_fkey;
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_workspace_id_fkey;

-- Create new UUID columns
ALTER TABLE workspaces ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE workspace_members ADD COLUMN workspace_id_uuid UUID;
ALTER TABLE documents ADD COLUMN workspace_id_uuid UUID;
ALTER TABLE claims ADD COLUMN workspace_id_uuid UUID;
ALTER TABLE contradictions ADD COLUMN workspace_id_uuid UUID;
ALTER TABLE collaborative_documents ADD COLUMN workspace_id_uuid UUID;
ALTER TABLE chat_sessions ADD COLUMN workspace_id_uuid UUID;

-- Populate UUID columns with generated UUIDs, mapping old IDs to new UUIDs
UPDATE workspaces SET id_uuid = gen_random_uuid();

UPDATE workspace_members wm
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE wm.workspace_id = w.id;

UPDATE documents d
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE d.workspace_id = w.id;

UPDATE claims c
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE c.workspace_id = w.id;

UPDATE contradictions c
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE c.workspace_id = w.id;

UPDATE collaborative_documents cd
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE cd.workspace_id = w.id;

UPDATE chat_sessions cs
SET workspace_id_uuid = w.id_uuid
FROM workspaces w
WHERE cs.workspace_id = w.id;

-- Drop old columns and rename new ones
ALTER TABLE workspaces DROP COLUMN id CASCADE;
ALTER TABLE workspaces RENAME COLUMN id_uuid TO id;
ALTER TABLE workspaces ADD PRIMARY KEY (id);

ALTER TABLE workspace_members DROP COLUMN workspace_id;
ALTER TABLE workspace_members RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE workspace_members ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE documents DROP COLUMN workspace_id;
ALTER TABLE documents RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE documents ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE claims DROP COLUMN workspace_id;
ALTER TABLE claims RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE claims ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE contradictions DROP COLUMN workspace_id;
ALTER TABLE contradictions RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE contradictions ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE collaborative_documents DROP COLUMN workspace_id;
ALTER TABLE collaborative_documents RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE collaborative_documents ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE chat_sessions DROP COLUMN workspace_id;
ALTER TABLE chat_sessions RENAME COLUMN workspace_id_uuid TO workspace_id;
ALTER TABLE chat_sessions ALTER COLUMN workspace_id SET NOT NULL;

-- Recreate foreign key constraints
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE documents ADD CONSTRAINT documents_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE claims ADD CONSTRAINT claims_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE contradictions ADD CONSTRAINT contradictions_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE collaborative_documents ADD CONSTRAINT collaborative_documents_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Recreate indexes
DROP INDEX IF EXISTS idx_workspaces_owner;
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

DROP INDEX IF EXISTS idx_workspace_members_workspace;
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);

-- 4. Recreate security definer function with UUID
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_id_param UUID)
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

-- 5. Recreate all policies with UUID support

-- Workspace policies
CREATE POLICY "Users can view workspaces" ON workspaces 
FOR SELECT USING (
  owner_id = auth.uid() OR 
  id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Owners can update their workspaces" ON workspaces
FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" ON workspaces
FOR DELETE USING (owner_id = auth.uid());

-- Workspace member policies
CREATE POLICY "Owners can view all members" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR is_workspace_owner(workspace_id)
  );

CREATE POLICY "Owners can manage members" ON workspace_members
  FOR ALL USING (is_workspace_owner(workspace_id));

-- Document policies
CREATE POLICY "Members can view documents in their workspaces" ON documents
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Editors can create documents" ON documents
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can update documents" ON documents
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can delete documents" ON documents
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

-- Claims policies  
CREATE POLICY "Users can view claims" ON claims
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Storage policies
CREATE POLICY "Editors can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id::text = (storage.foldername(name))[1]
    AND role IN ('owner', 'editor')
  )
);

CREATE POLICY "Members can view workspace documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Editors can update documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id::text = (storage.foldername(name))[1]
    AND role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM workspace_members
    WHERE workspace_id::text = (storage.foldername(name))[1]
    AND role IN ('owner', 'editor')
  )
);

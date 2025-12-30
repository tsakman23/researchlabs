-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for documents bucket
-- Users can upload documents to their own workspaces
CREATE POLICY "Users can upload documents to owned workspaces"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM workspaces WHERE owner_id = auth.uid()
  )
);

-- Users can view documents in workspaces they're members of
CREATE POLICY "Members can view workspace documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- Users can update documents in workspaces they own or edit
CREATE POLICY "Editors can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

-- Users can delete documents in workspaces they own or edit
CREATE POLICY "Editors can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT workspace_id::text FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
  )
);

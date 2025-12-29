// Database types
export type Workspace = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  privacy: 'private' | 'shared_link';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type WorkspaceMember = {
  id: number;
  workspace_id: number;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
};

export type Document = {
  id: number;
  workspace_id: number;
  title: string;
  description: string | null;
  file_url: string | null;
  file_type: 'pdf' | 'text' | 'url';
  file_size: number | null;
  page_count: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Claim = {
  id: number;
  workspace_id: number;
  document_id: number;
  extracted_by: string | null;
  claim_text: string;
  source_page_num: number | null;
  source_paragraph_num: number | null;
  confidence_score: number;
  status: 'extracted' | 'verified' | 'disputed' | 'needs_review';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Contradiction = {
  id: number;
  workspace_id: number;
  claim_a_id: number;
  claim_b_id: number;
  detected_at: string;
  confidence_score: number | null;
  explanation: string | null;
  status: string;
  resolved_by: string | null;
  resolved_note: string | null;
};

export type CollaborativeDocument = {
  id: number;
  workspace_id: number;
  title: string;
  content_snapshot: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ChatSession = {
  id: number;
  workspace_id: number;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ChatMessage = {
  id: number;
  session_id: number;
  user_id: string | null;
  message_text: string;
  message_type: 'user' | 'ai' | 'system';
  cited_claim_ids: number[] | null;
  created_at: string;
};

// User type (from Supabase Auth)
export type User = {
  id: string;
  email: string;
  display_name: string | null;
  profile_picture_url: string | null;
  created_at: string;
};

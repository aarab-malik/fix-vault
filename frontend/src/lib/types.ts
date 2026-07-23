export type ProviderPreset = {
  id: string;
  label: string;
  base_url: string;
  default_chat_model?: string | null;
  default_embedding_model?: string | null;
  default_dimensions?: number;
  supports_embeddings?: boolean;
  key_hint?: string;
  docs_url?: string;
};

export type User = {
  id: string;
  email: string;
  credentials_configured: boolean;
  semantic_configured: boolean;
  chat_configured: boolean;
  chat_validated: boolean;
  embedding_configured: boolean;
  embedding_validated: boolean;
  pinecone_configured: boolean;
  pinecone_validated: boolean;
  chat_provider?: string;
  chat_model?: string;
  chat_base_url?: string;
  chat_key_hint?: string;
  embedding_provider?: string;
  embedding_model?: string;
  embedding_dimensions?: number;
  embedding_base_url?: string;
  embedding_key_hint?: string;
  embedding_profile_fingerprint?: string;
  // Legacy aliases
  openai_configured: boolean;
  openai_validated_at?: string;
  pinecone_validated_at?: string;
  openai_key_hint?: string;
  pinecone_key_hint?: string;
  openai_base_url?: string;
  pinecone_index_host?: string;
};

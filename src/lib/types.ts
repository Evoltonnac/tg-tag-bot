export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multi_select';
  options?: string[]; // Pre-defined options
  allow_new?: boolean; // Allow creating new options
  required?: boolean;
}

export interface AiConfig {
  enabled: boolean;
  description?: string; // Default prompt description
  dify_api_key?: string; // User provided key
  dify_base_url?: string; // Optional custom URL
}

export interface ChatConfig {
  fields: FieldConfig[];
  // Store dynamic options/tags found in usage
  dynamic_options?: Record<string, string[]>; 
  ai_config?: AiConfig;
}

export interface TagData {
    chatId: string;
    messageId: string;
    tags: Record<string, string[]>; // key -> list of tags
}

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

export interface ChatConfig {
  fields: FieldConfig[];
  // Store dynamic options/tags found in usage
  dynamic_options?: Record<string, string[]>; 
}

export interface TagData {
    chatId: string;
    messageId: string;
    tags: Record<string, string[]>; // key -> list of tags
}

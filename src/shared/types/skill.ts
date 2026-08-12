export type JSONSchema7Basic = {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'integer';
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  description?: string;
};

export interface Skill {
  id: string;
  name: string;
  description: string;
  source_type: 'scan' | 'manual';
  source_path?: string;
  tags: string[];
  input_schema?: JSONSchema7Basic;
  output_schema?: JSONSchema7Basic;
  preconditions: string[];
  side_effects: string[];
  estimated_duration?: string;
  related_skill_ids: string[];
  raw_markdown?: string;
  created_at: number;
  updated_at: number;
}

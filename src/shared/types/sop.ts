export type SOPNodeType = 'start' | 'end' | 'skill' | 'condition' | 'parallel' | 'manual';

export interface SOPNode {
  id: string;
  type: SOPNodeType;
  title: string;
  description?: string;
  skill_id?: string;
  input_mapping?: Record<string, string>;
  output_alias?: Record<string, string>;
  condition_expr?: string;
  manual_checklist?: string[];
  position?: { x: number; y: number };
}

export interface SOPEdge {
  id: string;
  from: string;
  to: string;
  condition_label?: string;
}

export interface SOP {
  id: string;
  name: string;
  goal: string;
  version: string;
  nodes: SOPNode[];
  edges: SOPEdge[];
  success_criteria: string[];
  tags: string[];
  source?: 'generated' | 'imported';
  source_markdown?: string;
  created_at: number;
  updated_at: number;
  explanation?: string;
}

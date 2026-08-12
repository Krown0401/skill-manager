/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  source_type: 'scan' | 'manual';
  source_path?: string;
  tags: string[];
  preconditions: string[];
  side_effects: string[];
  related_skill_ids: string[];
  estimated_duration?: string;
  raw_markdown?: string;
  created_at: number;
  updated_at: number;
}

type SOPNodeType = 'start' | 'end' | 'skill' | 'condition' | 'parallel' | 'manual';
interface SOPNode {
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
interface SOPEdge { id: string; from: string; to: string; condition_label?: string; }
interface SOP {
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
}

type ReviewDimension = 'dependency_integrity' | 'io_matching' | 'flow_completeness'
  | 'manual_gate_reasonable' | 'skill_purity' | 'parallelism'
  | 'granularity_consistency' | 'description_clarity';
type FindingSeverity = 'critical' | 'warning' | 'suggestion';
interface ReviewFinding {
  id: string; severity: FindingSeverity; dimension: ReviewDimension;
  title: string; detail: string;
  related_node_ids?: string[]; suggestion?: string;
  suspected_parse_error?: boolean;
}
interface ReviewResult {
  overall_score: number;
  dimension_scores: Record<ReviewDimension, { score: number; findings: ReviewFinding[] }>;
  summary: string;
}

declare interface Window {
  api: {
    ping: () => Promise<any>;
    skill: {
      scanDirectory: (dirPath: string) => Promise<Skill[]>;
      getAll: () => Promise<Skill[]>;
      save: (skill: Skill) => Promise<Skill>;
      delete: (id: string) => Promise<void>;
      llmEnrich: (id: string) => Promise<Skill>;
    };
    sop: {
      getAll: () => Promise<{ id: string; name: string; goal: string; source?: any; updated_at: number; created_at: number }[]>;
      get: (id: string) => Promise<SOP | null>;
      save: (sop: SOP) => Promise<SOP>;
      delete: (id: string) => Promise<void>;
      generate: (payload: { goal: string; selectedSkillIds: string[]; reviewConfig: any }) => Promise<SOP & { explanation?: string }>;
      importMarkdown: (text: string, cfg: any) => Promise<SOP>;
      review: (sopId: string, cfg: any) => Promise<ReviewResult>;
      export: (id: string, format: 'json' | 'md') => Promise<{ filename: string; content: string }>;
    };
    settings: {
      get: () => Promise<{
        llm: { apiKey: string; baseURL: string; model: string };
        scanDirs: string[];
      }>;
      save: (config: any) => Promise<void>;
      testLlmConnection: () => Promise<{ ok: boolean; message: string }>;
    };
    dialog: {
      pickDirectory: () => Promise<string | null>;
    };
  };
}

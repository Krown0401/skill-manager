export type ReviewDimension =
  | 'dependency_integrity'
  | 'io_matching'
  | 'flow_completeness'
  | 'manual_gate_reasonable'
  | 'skill_purity'
  | 'parallelism'
  | 'granularity_consistency'
  | 'description_clarity';

export interface ReviewDimensionMeta {
  key: ReviewDimension;
  name: string;
  icon: string;
  description: string;
  default_rank: number;
}

export interface ReviewConfig {
  dimension_order: ReviewDimension[];
}

export type FindingSeverity = 'critical' | 'warning' | 'suggestion';

export interface ReviewFinding {
  id: string;
  severity: FindingSeverity;
  dimension: ReviewDimension;
  title: string;
  detail: string;
  related_node_ids?: string[];
  suggestion?: string;
  suspected_parse_error?: boolean;
}

export interface ReviewResult {
  overall_score: number;
  dimension_scores: Record<ReviewDimension, {
    score: number;
    findings: ReviewFinding[];
  }>;
  summary: string;
}

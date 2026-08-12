import type { ReviewDimensionMeta } from '../types/review';

export const DEFAULT_DIMENSIONS: ReviewDimensionMeta[] = [
  { key: 'dependency_integrity',      name: '依赖完整性',       icon: '🔗', description: 'SOP 引用的 Skill 是否都存在，每个 Skill 的前置依赖是否被上游满足', default_rank: 0 },
  { key: 'io_matching',               name: '输入输出匹配度',   icon: '🔌', description: '上游输出能否覆盖下游输入要求，有没有参数传递断裂或浪费',       default_rank: 1 },
  { key: 'flow_completeness',         name: '流程冗余/缺失',     icon: '✅', description: '是否缺少关键环节（确认、校验），是否有冗余步骤',             default_rank: 2 },
  { key: 'manual_gate_reasonable',    name: '人工卡点合理性',   icon: '👤', description: '该有确认点的地方是否有 manual 节点，是否有过多不必要的人工干预', default_rank: 3 },
  { key: 'skill_purity',              name: 'Skill 职责纯度',   icon: '🎯', description: '是否有 Skill 职责过重（含多个不相关子流程）应拆分，或应合并',     default_rank: 4 },
  { key: 'parallelism',               name: '可并行性',         icon: '⚡', description: '有没有可以并行却被串行了的步骤',                                default_rank: 5 },
  { key: 'granularity_consistency',   name: '粒度一致性',       icon: '📐', description: '各节点粒度是否均衡，不会一个特别大或特别小',                    default_rank: 6 },
  { key: 'description_clarity',       name: '描述清晰度',       icon: '📝', description: '节点标题/description 是否清晰到另一个工程师接手就知道做什么',    default_rank: 7 }
];

export const DEFAULT_DIMENSION_ORDER = DEFAULT_DIMENSIONS.map(d => d.key);

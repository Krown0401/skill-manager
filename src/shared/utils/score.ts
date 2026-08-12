import type { ReviewDimension } from '../types/review';

const DECAY_FACTOR = 0.8;

export function calculateWeights(order: ReviewDimension[]): Record<ReviewDimension, number> {
  const weights = {} as Record<ReviewDimension, number>;
  let rawTotal = 0;
  order.forEach((dim, idx) => {
    const raw = Math.pow(DECAY_FACTOR, idx);
    weights[dim] = raw;
    rawTotal += raw;
  });
  (Object.keys(weights) as ReviewDimension[]).forEach(dim => {
    weights[dim] = Math.round((weights[dim] / rawTotal) * 1000) / 10;
  });
  return weights;
}

export function calculateOverallScore(
  order: ReviewDimension[],
  scores: Record<ReviewDimension, number>
): number {
  const w = calculateWeights(order);
  let total = 0;
  order.forEach(dim => { total += (scores[dim] * w[dim]) / 100; });
  return Math.round(total);
}

export function scoreLevel(score: number): { label: string; color: string; className: string } {
  if (score < 60) return { label: '❌ 不合格 · 存在阻塞性问题', color: '#ef4444', className: 'score-bad' };
  if (score < 75) return { label: '⚠️ 需优化 · 有改进空间',    color: '#f59e0b', className: 'score-warn' };
  if (score < 90) return { label: '✅ 良好 · 可投入使用',      color: '#10b981', className: 'score-good' };
  return { label: '🌟 优秀 · 编排合理',                       color: '#0ea5e9', className: 'score-excellent' };
}

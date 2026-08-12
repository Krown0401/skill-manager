import { describe, it, expect } from 'vitest';
import { calculateWeights, calculateOverallScore, scoreLevel } from '../../src/shared/utils/score';
import { DEFAULT_DIMENSION_ORDER } from '../../src/shared/constants/dimensions';
import type { ReviewDimension } from '../../src/shared/types/review';

describe('calculateWeights', () => {
  it('8 维度默认排序下权重和 = 100，首位 ~24%，末位 ~5%（DECAY_FACTOR=0.8）', () => {
    const w = calculateWeights(DEFAULT_DIMENSION_ORDER);
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(Math.round(sum)).toBe(100);
    const first = w[DEFAULT_DIMENSION_ORDER[0]];
    const last = w[DEFAULT_DIMENSION_ORDER[DEFAULT_DIMENSION_ORDER.length - 1]];
    expect(first).toBeGreaterThan(23);
    expect(first).toBeLessThan(25);
    expect(last).toBeGreaterThan(4);
    expect(last).toBeLessThan(6);
  });
});

describe('calculateOverallScore', () => {
  it('全 100 分 → 综合 100，全 0 → 综合 0', () => {
    const all100 = {} as Record<ReviewDimension, number>;
    const all0 = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => { all100[d] = 100; all0[d] = 0; });
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, all100)).toBe(100);
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, all0)).toBe(0);
  });

  it('全部 80 分 → 综合分四舍五入 = 80', () => {
    const s = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => s[d] = 80);
    expect(calculateOverallScore(DEFAULT_DIMENSION_ORDER, s)).toBe(80);
  });

  it('优先级首位满分其他 0 → 综合 ≈ 首位权重', () => {
    const s = {} as Record<ReviewDimension, number>;
    DEFAULT_DIMENSION_ORDER.forEach(d => s[d] = 0);
    s[DEFAULT_DIMENSION_ORDER[0]] = 100;
    const weights = calculateWeights(DEFAULT_DIMENSION_ORDER);
    const expected = Math.round(weights[DEFAULT_DIMENSION_ORDER[0]]);
    expect(Math.abs(calculateOverallScore(DEFAULT_DIMENSION_ORDER, s) - expected)).toBeLessThanOrEqual(1);
  });
});

describe('scoreLevel', () => {
  it('正确映射颜色区间', () => {
    expect(scoreLevel(59).color).toBe('#ef4444');
    expect(scoreLevel(60).color).toBe('#f59e0b');
    expect(scoreLevel(74).color).toBe('#f59e0b');
    expect(scoreLevel(75).color).toBe('#10b981');
    expect(scoreLevel(89).color).toBe('#10b981');
    expect(scoreLevel(90).color).toBe('#0ea5e9');
  });
});

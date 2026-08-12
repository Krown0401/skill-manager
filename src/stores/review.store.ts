import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ReviewConfig, ReviewResult } from '@/shared/types/review';
import { DEFAULT_DIMENSION_ORDER } from '@/shared/constants/dimensions';

export const useReviewStore = defineStore('review', () => {
  const currentReviewConfig = ref<ReviewConfig>({
    dimension_order: [...DEFAULT_DIMENSION_ORDER]
  });
  const lastReviewResult = ref<ReviewResult | null>(null);
  const reviewing = ref(false);

  function resetConfig() {
    currentReviewConfig.value.dimension_order = [...DEFAULT_DIMENSION_ORDER];
  }

  async function review(sopId: string) {
    reviewing.value = true;
    try {
      lastReviewResult.value = await window.api.sop.review(sopId, currentReviewConfig.value);
      return lastReviewResult.value;
    } finally {
      reviewing.value = false;
    }
  }

  return { currentReviewConfig, lastReviewResult, reviewing, resetConfig, review };
});

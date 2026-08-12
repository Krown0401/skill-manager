import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layout/MainLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/dashboard/Dashboard.vue'), meta: { title: '首页' } },
      { path: 'skills', name: 'skills', component: () => import('@/views/skills/SkillList.vue'), meta: { title: 'Skill 库管理' } },
      { path: 'sop-generator', name: 'sop-generator', component: () => import('@/views/sop-generator/GeneratorForm.vue'), meta: { title: 'SOP 智能生成' } },
      { path: 'sop-review', name: 'sop-review', component: () => import('@/views/sop-review/ReviewImport.vue'), meta: { title: 'SOP 审查优化' } },
      { path: 'sops/:id', name: 'sop-detail', component: () => import('@/views/sop-detail/SOPDetail.vue'), meta: { title: 'SOP 详情' } },
      { path: 'settings', redirect: '/settings/llm' },
      { path: 'settings/llm', name: 'settings-llm', component: () => import('@/views/settings/LlmConfig.vue'), meta: { title: 'LLM 配置' } },
      { path: 'settings/storage', name: 'settings-storage', component: () => import('@/views/settings/StorageConfig.vue'), meta: { title: '存储与扫描' } },
      { path: 'settings/about', name: 'settings-about', component: () => import('@/views/settings/About.vue'), meta: { title: '关于' } }
    ]
  }
];

export default createRouter({ history: createWebHashHistory(), routes });

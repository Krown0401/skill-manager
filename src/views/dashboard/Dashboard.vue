<template>
  <el-row :gutter="16">
    <el-col :span="6"><el-card shadow="hover"><div class="stat-num">{{ skillCount }}</div><div>Skill 总数</div></el-card></el-col>
    <el-col :span="6"><el-card shadow="hover"><div class="stat-num">{{ sopCount }}</div><div>SOP 总数</div></el-card></el-col>
    <el-col :span="12">
      <el-card shadow="hover">
        <div style="font-weight: 600; margin-bottom: 12px;">🚀 快捷操作</div>
        <el-space>
          <el-button type="primary" @click="$router.push('/skills')">管理 Skill 库</el-button>
          <el-button type="success" @click="$router.push('/sop-generator')">生成新 SOP</el-button>
          <el-button type="warning" @click="$router.push('/sop-review')">审查已有 SOP</el-button>
        </el-space>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
const skillCount = ref(0);
const sopCount = ref(0);
onMounted(async () => {
  try {
    const [skills, sops] = await Promise.all([window.api.skill.getAll(), window.api.sop.getAll()]);
    skillCount.value = skills.length;
    sopCount.value = sops.length;
  } catch { /* storage 未初始化会抛，忽略 */ }
});
</script>

<style scoped>
.stat-num { font-size: 32px; font-weight: 700; color: #409eff; margin-bottom: 8px; }
</style>

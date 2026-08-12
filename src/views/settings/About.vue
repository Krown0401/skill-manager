<template>
  <el-card>
    <template #header>ℹ️ 关于</template>
    <el-descriptions :column="1" border>
      <el-descriptions-item label="应用名称">Skill-SOP 智能编排与审查工具</el-descriptions-item>
      <el-descriptions-item label="版本">v0.1.0 (M1 脚手架)</el-descriptions-item>
      <el-descriptions-item label="技术栈">Electron + Vue 3 + TypeScript + AntV X6/G2 + Element Plus</el-descriptions-item>
      <el-descriptions-item label="说明">
        本工具为 V1 早期版本。当前里程碑 M1：验证 Electron + Vue3 脚手架跑通。<br />
        M2/M3：Skill 库管理 + LLM 客户端。M4/M5/M6：场景 A 生成 + 场景 B 审查。M7/M8：导出 + 打包。
      </el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
</script>

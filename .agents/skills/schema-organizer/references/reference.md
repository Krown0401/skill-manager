# Schema 整理工具脚本

提供一系列实用脚本，帮助快速整理和分析 schema 配置。

## 前置准备

### 安装依赖

```bash
# 需要 jq 工具处理 JSON
# Windows 用户可通过 Chocolatey 安装
choco install jq

# 或使用 Scoop
scoop install jq

# 或直接下载二进制文件
# https://stedolan.github.io/jq/download/
```

---

## 脚本 1: 统计各院区单据数量

**文件名**: `scripts/count-forms.ps1`

### PowerShell 版本 (count-forms.ps1)

```powershell
Write-Host "======================================" -ForegroundColor Green
Write-Host "各院区表单配置统计" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

$hospitals = @("华西医院", "医大一", "湖南人民医院", "自贡四院", "重庆中医院", "福建人民医院", "成都高新区妇女儿童医院", "江西妇幼", "湖南职防院")

$header = "{0,-25} | {1,-10} | {2,-10} | {3,-10}" -f "院区", "事前申请", "报销单据", "资金单据"
Write-Host $header
Write-Host ("-" * 70)

foreach ($hospital in $hospitals) {
    $path = Join-Path -Path (Get-Location) -ChildPath $hospital
    
    if (Test-Path $path) {
        # 统计事前申请
        $prePath = Join-Path -Path $path -ChildPath "事前申请"
        $preCount = (Get-ChildItem -Path $prePath -Recurse -Filter "form.json" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*模板组件*" }).Count
        
        # 统计报销单据
        $reimPath = Join-Path -Path $path -ChildPath "报销单据"
        $reimCount = (Get-ChildItem -Path $reimPath -Recurse -Filter "form.json" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*模板组件*" }).Count
        
        # 统计资金单据
        $fundPath = Join-Path -Path $path -ChildPath "资金单据"
        $fundCount = (Get-ChildItem -Path $fundPath -Recurse -Filter "form.json" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*模板组件*" }).Count
        
        Write-Host ("{0,-25} | {1,-10} | {2,-10} | {3,-10}" -f $hospital, $preCount, $reimCount, $fundCount)
    }
}

Write-Host ""
Write-Host "注：不包含模板组件" -ForegroundColor Gray
```

---

## 脚本 2: 查找字段引用位置

**文件名**: `scripts/search-field.ps1`

### PowerShell 版本

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$fieldName
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "搜索字段：$fieldName" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 搜索所有 JSON 文件
$results = Select-String -Path "*.json" -Pattern "`"$fieldName`"" -Recursive -CaseSensitive

if ($results.Count -eq 0) {
    Write-Host "未找到字段：$fieldName" -ForegroundColor Yellow
    exit 0
}

Write-Host "找到 $($results.Count) 处匹配" -ForegroundColor Green
Write-Host ""

# 按文件分组显示
$results | Group-Object -Property Path | ForEach-Object {
    $file = $_.Name
    
    # 提取院区信息
    $parts = $file -split '\\'
    $hospital = if ($parts.Count -gt 1) { $parts[1] } else { "未知" }
    
    # 判断是否为模板组件
    $isTemplate = $file -like "*模板组件*"
    
    if ($isTemplate) {
        Write-Host "[模板组件] $file" -ForegroundColor Blue
    } else {
        Write-Host "[$hospital] $file" -ForegroundColor White
    }
    
    # 显示上下文
    $context = Select-String -Path $file -Pattern "`"$fieldName`"" -Context 2, 2
    $context | ForEach-Object {
        Write-Host "  Line $($_.LineNumber):" -ForegroundColor Gray
        Write-Host "  $($_.Context.PreContext)" -ForegroundColor Gray
        Write-Host "  >> $($_.Line)" -ForegroundColor Yellow
        Write-Host "  $($_.Context.PostContext)" -ForegroundColor Gray
    }
    
    Write-Host "---" -ForegroundColor Gray
    Write-Host ""
}
```

---

## 脚本 3: 提取 schema 字段列表

**文件名**: `extract-fields.ps1`

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$filePath,
    
    [string]$outputFile = "fields-output.txt"
)

Write-Host "正在处理：$filePath" -ForegroundColor Cyan

# 读取 JSON 文件
try {
    $json = Get-Content -Path $filePath -Raw | ConvertFrom-Json
} catch {
    Write-Host "JSON 解析失败：$_" -ForegroundColor Red
    exit 1
}

# 递归提取字段
function Extract-Fields {
    param(
        $schema,
        [string]$prefix,
        [int]$indent = 0
    )
    
    $properties = $schema.PSObject.Properties | Where-Object { $_.MemberType -eq 'NoteProperty' }
    
    foreach ($prop in $properties) {
        $value = $prop.Value
        $fieldName = $prop.Name
        
        # 跳过没有 name 属性的节点
        if (-not $value.name) {
            continue
        }
        
        $fullName = if ($prefix) { "$prefix.$($value.name)" } else { $value.name }
        $component = if ($value.'x-component') { "[$($value.'x-component')]" } else { "" }
        $type = if ($value.type) { "($($value.type))" } else { "" }
        
        $indentStr = "  " * $indent
        Write-Output "$indentStr├─ $($value.name) $type $component"
        
        # 递归处理子属性
        if ($value.properties) {
            Extract-Fields -schema $value.properties -prefix $fullName -indent ($indent + 1)
        }
    }
}

# 从 form 节点开始提取
$formSchema = $json.properties.form.properties
$output = Extract-Fields -schema $formSchema -prefix "" -indent 0

# 输出到文件
$output | Out-File -FilePath $outputFile -Encoding utf8
Write-Host "字段列表已保存到：$outputFile" -ForegroundColor Green

# 显示前 20 行
Write-Host "`n前 20 行预览:" -ForegroundColor Cyan
$output | Select-Object -First 20
```

---

## 脚本 4: 对比两个 schema 文件

**文件名**: `compare-schemas.ps1`

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$file1,
    
    [Parameter(Mandatory=$true)]
    [string]$file2
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Schema 对比" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "文件 1: $file1" -ForegroundColor White
Write-Host "文件 2: $file2" -ForegroundColor White
Write-Host ""

# 检查文件存在
if (-not (Test-Path $file1)) {
    Write-Host "文件不存在：$file1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $file2)) {
    Write-Host "文件不存在：$file2" -ForegroundColor Red
    exit 1
}

# 读取 JSON
try {
    $json1 = Get-Content -Path $file1 -Raw | ConvertFrom-Json
    $json2 = Get-Content -Path $file2 -Raw | ConvertFrom-Json
} catch {
    Write-Host "JSON 解析失败：$_" -ForegroundColor Red
    exit 1
}

# 提取顶层字段
$fields1 = $json1.properties.form.properties.PSObject.Properties.Name | Sort-Object
$fields2 = $json2.properties.form.properties.PSObject.Properties.Name | Sort-Object

# 找出差异
$onlyIn1 = $fields1 | Where-Object { $_ -notin $fields2 }
$onlyIn2 = $fields2 | Where-Object { $_ -notin $fields1 }
$common = $fields1 | Where-Object { $_ -in $fields2 }

Write-Host "统计信息:" -ForegroundColor Green
Write-Host "  文件 1 字段数：$($fields1.Count)"
Write-Host "  文件 2 字段数：$($fields2.Count)"
Write-Host "  共有字段：$($common.Count)"
Write-Host ""

if ($onlyIn1.Count -gt 0) {
    Write-Host "仅在文件 1 中存在的字段 ($($onlyIn1.Count)):" -ForegroundColor Yellow
    $onlyIn1 | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
}

if ($onlyIn2.Count -gt 0) {
    Write-Host "仅在文件 2 中存在的字段 ($($onlyIn2.Count)):" -ForegroundColor Yellow
    $onlyIn2 | ForEach-Object { Write-Host "  - $_" }
    Write-Host ""
}

# 分析共有字段的配置差异
Write-Host "共有字段的配置差异:" -ForegroundColor Cyan
$diffCount = 0

foreach ($field in $common) {
    $field1Config = $json1.properties.form.properties.$field
    $field2Config = $json2.properties.form.properties.$field
    
    # 比较关键字段
    $diffs = @()
    
    if ($field1Config.title -ne $field2Config.title) {
        $diffs += "title: '$($field1Config.title)' vs '$($field2Config.title)'"
    }
    
    if ($field1Config.'x-component' -ne $field2Config.'x-component') {
        $comp1 = $field1Config.'x-component' ?? "null"
        $comp2 = $field2Config.'x-component' ?? "null"
        $diffs += "component: '$comp1' vs '$comp2'"
    }
    
    if ($field1Config.required -ne $field2Config.required) {
        $diffs += "required: '$($field1Config.required)' vs '$($field2Config.required)'"
    }
    
    if ($diffs.Count -gt 0) {
        $diffCount++
        Write-Host "`n  [$field]" -ForegroundColor Yellow
        $diffs | ForEach-Object { Write-Host "    - $_" }
    }
}

Write-Host "`n总结:" -ForegroundColor Green
Write-Host "  配置不同的字段数：$diffCount / $($common.Count)"
```

---

## 脚本 5: 批量备份 schema 文件

**文件名**: `backup-schemas.ps1`

```powershell
param(
    [string]$backupDir = "schema-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

Write-Host "======================================" -ForegroundColor Green
Write-Host "Schema 批量备份工具" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# 创建备份目录
$backupPath = Join-Path -Path (Get-Location) -ChildPath $backupDir
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
Write-Host "备份目录：$backupPath" -ForegroundColor Cyan
Write-Host ""

# 查找所有 form.json 文件
$formFiles = Get-ChildItem -Path "." -Recurse -Filter "form.json" -File

$totalCount = $formFiles.Count
$currentCount = 0

Write-Host "找到 $totalCount 个 schema 文件" -ForegroundColor Green
Write-Host "开始备份..." -ForegroundColor Cyan
Write-Host ""

# 进度条
$progressParams = @{
    Activity = "备份 Schema 文件"
    Status = "进度"
    PercentComplete = 0
}

foreach ($file in $formFiles) {
    $currentCount++
    
    # 计算相对路径
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # 创建目标目录结构
    $targetDir = Join-Path -Path $backupPath -ChildPath (Split-Path $relativePath -Parent)
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    
    # 复制文件
    $targetPath = Join-Path -Path $targetDir -ChildPath $file.Name
    Copy-Item -Path $file.FullName -Destination $targetPath
    
    # 更新进度
    $percent = [int]($currentCount / $totalCount * 100)
    $progressParams.PercentComplete = $percent
    Write-Progress @progressParams
}

Write-Host ""
Write-Host "备份完成!" -ForegroundColor Green
Write-Host "  备份文件数：$totalCount" -ForegroundColor White
Write-Host "  备份位置：$backupPath" -ForegroundColor White
Write-Host ""
Write-Host "提示：可以使用以下命令恢复备份:" -ForegroundColor Yellow
Write-Host "  Copy-Item -Path '$backupPath\*' -Destination '.' -Recurse -Force" -ForegroundColor Gray
```

---

## 脚本 6: 生成 schema 变动报告

**文件名**: `generate-change-report.ps1`

```powershell
param(
    [string]$sinceCommit = "HEAD~1",
    [string]$outputFile = "schema-change-report.md"
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Schema 变动报告生成器" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 获取 git 变更的文件列表
Write-Host "获取从 $sinceCommit 的变更..." -ForegroundColor Gray
$changedFiles = git diff --name-only $sinceCommit -- '*.json'

if ([string]::IsNullOrWhiteSpace($changedFiles)) {
    Write-Host "没有找到 JSON 文件的变更" -ForegroundColor Yellow
    exit 0
}

Write-Host "找到 $($changedFiles.Count) 个变更的文件" -ForegroundColor Green
Write-Host ""

# 生成报告
$report = @()
$report += "# Schema 变动报告"
$report += ""
$report += "**生成时间**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$report += "**对比范围**: $sinceCommit"
$report += ""
$report += "---"
$report += ""

# 按院区分组
$groupedChanges = $changedFiles | Group-Object { 
    $_.Split('\')[1] 
}

foreach ($group in $groupedChanges) {
    $hospital = $group.Name
    $files = $group.Group
    
    $report += "## $hospital"
    $report += ""
    
    foreach ($file in $files) {
        $report += "### $file"
        $report += ""
        
        # 获取变更统计
        $stats = git diff $sinceCommit -- $file --numstat
        if ($stats) {
            $added = $stats.Split()[0]
            $deleted = $stats.Split()[1]
            
            $report += "**变更统计**: +$added 行 / -$deleted 行"
            $report += ""
        }
        
        # 获取变更摘要
        $diff = git diff $sinceCommit -- $file
        $commitMessages = git log $sinceCommit..HEAD --pretty=format:"- %s" -- $file
        
        if ($commitMessages) {
            $report += "**相关提交**:"
            $report += $commitMessages
            $report += ""
        }
        
        $report += "---"
        $report += ""
    }
}

# 写入文件
$report | Out-File -FilePath $outputFile -Encoding utf8

Write-Host "报告已生成：$outputFile" -ForegroundColor Green
Write-Host ""

# 打开文件（可选）
Write-Host "是否打开报告文件？(Y/N)" -ForegroundColor Yellow
$response = Read-Host
if ($response -eq 'Y' -or $response -eq 'y') {
    Invoke-Item $outputFile
}
```

---

## 使用示例

### 示例 1: 统计所有院区的表单数量

```powershell
# 执行统计脚本
.\count-forms.ps1

# 输出:
# 院区                      | 事前申请   | 报销单据   | 资金单据  
# ----------------------------------------------------------------------
# 华西医院                  | 12         | 26         | 2         
# 医大一                    | 2          | 16         | 0         
# ...
```

### 示例 2: 查找某个字段的所有使用位置

```powershell
# 搜索 reimbursementTotalAmount 字段
.\search-field.ps1 reimbursementTotalAmount

# 输出:
# [华西医院] 华西医院\报销单据\举办会议报销单\pc\form.json
#   Line 45:
#     "type": "string",
#     "title": "报销金额",
#     >> "name": "reimbursementTotalAmount",
#     "x-component": "DtMoneyInput"
# ---
```

### 示例 3: 对比两个院区的同一单据

```powershell
# 对比华西和医大一的会议报销单
.\compare-schemas.ps1 `
  -file1 "华西医院\报销单据\举办会议报销单_holdMeetingReimburseForm\pc\form.json" `
  -file2 "医大一\报销单据\举办会议报销单_holdMeetingReimburseForm\pc\form.json"
```

### 示例 4: 批量备份所有 schema

```powershell
# 备份所有 schema 文件
.\backup-schemas.ps1

# 指定备份目录
.\backup-schemas.ps1 -backupDir "my-backup-20260325"
```

---

## 注意事项

1. **PowerShell 执行策略**: 如果无法执行脚本，可能需要修改执行策略
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```

2. **Git 命令依赖**: 部分脚本需要 git 环境，确保已安装 Git for Windows

3. **JSON 格式要求**: 所有脚本假设 JSON 文件格式正确，错误的 JSON 会导致解析失败

4. **大文件处理**: 对于超过 10MB 的 schema 文件，建议分段处理或使用专业工具

---

## 扩展开发

可以根据具体需求，基于这些基础脚本开发更多功能：

- ✅ Schema 自动修复工具
- ✅ 配置标准化检查工具
- ✅ 字段命名规范检查
- ✅ 联动逻辑可视化工具
- ✅ 校验规则汇总工具

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

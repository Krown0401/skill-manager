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

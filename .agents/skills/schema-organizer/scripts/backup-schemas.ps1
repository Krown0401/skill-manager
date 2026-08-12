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
}

Write-Host ""
Write-Host "备份完成!" -ForegroundColor Green
Write-Host "  备份文件数：$totalCount" -ForegroundColor White
Write-Host "  备份位置：$backupPath" -ForegroundColor White
Write-Host ""
Write-Host "提示：可以使用以下命令恢复备份:" -ForegroundColor Yellow
Write-Host "  Copy-Item -Path '$backupPath\*' -Destination '.' -Recurse -Force" -ForegroundColor Gray

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

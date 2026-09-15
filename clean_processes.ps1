# clean_processes.ps1
# اسکریپت پاکسازی پورت‌های تداخلی Next.js (پورت 3000) و سایر سرویس‌های محلی

$portsToClean = @(3000)

foreach ($port in $portsToClean) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $processId = $conn.OwningProcess
                if ($processId -gt 0) {
                    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Host "[INFO] Freeing port $port by stopping process $($proc.ProcessName) (PID: $processId)..." -ForegroundColor Yellow
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        }
    } catch {
        # ignore errors
    }
}

Write-Host "[OK] Port cleanup completed." -ForegroundColor Green

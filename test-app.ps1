Write-Host "Testing ResearchLabs Application..." -ForegroundColor Cyan
Write-Host ""

Write-Host "TEST 1: Home Page..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200 -and $r.Content -match "ResearchLabs") {
        Write-Host " PASS" -ForegroundColor Green
    } else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "TEST 2: Login Page..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200 -and $r.Content -match "Sign in") {
        Write-Host " PASS" -ForegroundColor Green
    } else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "TEST 3: Signup Page..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/auth/signup" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200 -and $r.Content -match "Create your account") {
        Write-Host " PASS" -ForegroundColor Green
    } else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host "TEST 4: Database Test..." -NoNewline
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/test" -UseBasicParsing -TimeoutSec 10
    if ($r.StatusCode -eq 200) {
        Write-Host " PASS" -ForegroundColor Green
    } else { Write-Host " FAIL" -ForegroundColor Red }
} catch { Write-Host " FAIL" -ForegroundColor Red }

Write-Host ""
Write-Host "All tests completed!" -ForegroundColor Cyan

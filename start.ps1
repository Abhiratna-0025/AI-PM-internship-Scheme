#!/usr/bin/env pwsh
<#
============================================================
 WeatherGPT - Windows / PowerShell Startup Script

 Usage:
   .\start.ps1
   .\start.ps1 backend
   .\start.ps1 frontend
   .\start.ps1 setup
   .\start.ps1 test
   .\start.ps1 build
   .\start.ps1 stop

 Commands:
   start     Start backend + frontend (default)
   backend   Start backend only
   frontend  Start frontend only
   setup     Install deps + pull Ollama model (full project setup)
   test      Run backend tests
   build     Build backend + frontend
   stop      Stop WeatherGPT processes running on the configured ports

 Environment overrides:
   $env:OLLAMA_MODEL   Ollama model to pull/use (default: llama3.2)
============================================================
#>

param(
    [Parameter(Position = 0)]
    [string]$Command = "start"
)

$ErrorActionPreference = "Stop"

$ProjectDir  = $PSScriptRoot
$BackendDir  = Join-Path $ProjectDir "backend"
$FrontendDir = Join-Path $ProjectDir "frontend"

$BackendPort  = 8080
$FrontendPort = 3000
$OllamaPort   = 11434

# NOTE: change the default here (or set $env:OLLAMA_MODEL before running)
# to match whichever model your WeatherGPT backend actually expects.
$OllamaModel = if ($env:OLLAMA_MODEL) { $env:OLLAMA_MODEL } else { "llama3.2" }

$script:BackendProcess  = $null
$script:FrontendProcess = $null
$script:OllamaProcess   = $null

# ------------------------------------------------------------
# Logging helpers
# ------------------------------------------------------------

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# ------------------------------------------------------------
# Check command availability
# ------------------------------------------------------------

function Test-RequiredCommand {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "Required command not found: $Name"
        exit 1
    }
}

# ------------------------------------------------------------
# Port helpers
# ------------------------------------------------------------

function Test-PortInUse {
    param([int]$Port)

    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
        return ($conns.Count -gt 0)
    } catch {
        # Fallback for systems without the NetTCPIP module
        $result = netstat -ano | Select-String -Pattern ":$Port\s+.*LISTENING"
        return [bool]$result
    }
}

function Stop-Port {
    param([int]$Port)

    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop

        if ($conns) {
            Write-Warn "Stopping process(es) on port $Port..."

            foreach ($conn in $conns) {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            }

            Start-Sleep -Seconds 1
            Write-Success "Port $Port is now free."
        }
    } catch {
        Write-Warn "Could not query port $Port (Get-NetTCPConnection unavailable)."
    }
}

# ------------------------------------------------------------
# Cleanup (runs on Ctrl+C via try/finally in each command)
# ------------------------------------------------------------

function Invoke-Cleanup {
    Write-Host ""
    Write-Info "Stopping WeatherGPT..."

    if ($script:BackendProcess -and -not $script:BackendProcess.HasExited) {
        Stop-Process -Id $script:BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if ($script:FrontendProcess -and -not $script:FrontendProcess.HasExited) {
        Stop-Process -Id $script:FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }

    if ($script:OllamaProcess -and -not $script:OllamaProcess.HasExited) {
        Stop-Process -Id $script:OllamaProcess.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Success "WeatherGPT stopped."
}

# ------------------------------------------------------------
# Ollama
# ------------------------------------------------------------

function Invoke-OllamaPull {

    if (-not (Get-Command "ollama" -ErrorAction SilentlyContinue)) {
        Write-Warn "Ollama is not installed. Skipping model pull."
        return
    }

    Write-Info "Ensuring Ollama model '$OllamaModel' is available..."

    $pullOk = $true
    try {
        & ollama pull $OllamaModel
        if ($LASTEXITCODE -ne 0) { $pullOk = $false }
    } catch {
        $pullOk = $false
    }

    if ($pullOk) {
        Write-Success "Ollama model '$OllamaModel' ready."
        return
    }

    Write-Warn "Ollama pull failed. Attempting to start the Ollama server..."

    if (Test-PortInUse $OllamaPort) {
        Write-Warn "Ollama already appears to be running on port $OllamaPort, but the pull still failed."
        Write-Warn "Continuing anyway since Ollama is already up - it may already have the model, or you may be managing it yourself."
        return
    }

    $script:OllamaProcess = Start-Process -FilePath "ollama" -ArgumentList "serve" `
        -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput "$env:TEMP\weathergpt-ollama.log" `
        -RedirectStandardError "$env:TEMP\weathergpt-ollama.err.log"

    $count = 0
    while ($count -lt 30) {
        if (Test-PortInUse $OllamaPort) { break }

        if ($script:OllamaProcess.HasExited) {
            Write-Warn "Ollama server failed to start. See $env:TEMP\weathergpt-ollama.log"
            Write-Warn "Continuing without confirming the Ollama model - the backend may fail if it needs it."
            return
        }

        Start-Sleep -Seconds 1
        $count++
    }

    & ollama pull $OllamaModel
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Could not pull Ollama model '$OllamaModel' even after starting the server."
        Write-Warn "Continuing anyway - the backend may fail if it needs this model."
        return
    }

    Write-Success "Ollama model '$OllamaModel' ready."
}

# ------------------------------------------------------------
# Full project setup (dependencies + model)
# ------------------------------------------------------------

function Invoke-Setup {

    Test-RequiredCommand "mvn"
    Test-RequiredCommand "npm"
    # Ollama is checked inside Invoke-OllamaPull and skipped (not fatal) if missing.

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "                 WEATHERGPT SETUP"
    Write-Host "============================================================"
    Write-Host ""

    if (-not (Test-Path $BackendDir)) {
        Write-ErrorMsg "Backend directory not found: $BackendDir"
        exit 1
    }

    if (-not (Test-Path $FrontendDir)) {
        Write-ErrorMsg "Frontend directory not found: $FrontendDir"
        exit 1
    }

    Write-Info "Installing backend dependencies (Maven)..."
    Push-Location $BackendDir
    try {
        mvn -q dependency:resolve
    } finally {
        Pop-Location
    }
    Write-Success "Backend dependencies resolved."

    Write-Info "Installing frontend dependencies (npm)..."
    Push-Location $FrontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
    Write-Success "Frontend dependencies installed."

    Invoke-OllamaPull

    Write-Host ""
    Write-Success "WeatherGPT setup complete."
    Write-Host ""
}

# ------------------------------------------------------------
# Backend
# ------------------------------------------------------------

function Start-Backend {

    Test-RequiredCommand "java"
    Test-RequiredCommand "mvn"

    if (-not (Test-Path $BackendDir)) {
        Write-ErrorMsg "Backend directory not found:"
        Write-ErrorMsg "$BackendDir"
        exit 1
    }

    if (-not (Test-Path (Join-Path $BackendDir "pom.xml"))) {
        Write-ErrorMsg "pom.xml not found in backend directory."
        exit 1
    }

    if (Test-PortInUse $BackendPort) {
        Write-Warn "Port $BackendPort is already in use."
        Write-Warn "Assuming WeatherGPT backend may already be running."
        Write-Info "Backend URL: http://localhost:$BackendPort"
        return
    }

    Write-Info "Starting WeatherGPT Backend..."

    $script:BackendProcess = Start-Process -FilePath "mvn" -ArgumentList "spring-boot:run" `
        -WorkingDirectory $BackendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput "$env:TEMP\weathergpt-backend.log" `
        -RedirectStandardError "$env:TEMP\weathergpt-backend.err.log"

    Write-Info "Waiting for backend on port $BackendPort..."

    $count = 0
    while ($count -lt 60) {

        if (Test-PortInUse $BackendPort) {
            Write-Success "WeatherGPT Backend started!"
            Write-Success "Backend: http://localhost:$BackendPort"
            return
        }

        if ($script:BackendProcess.HasExited) {
            Write-ErrorMsg "Backend process stopped unexpectedly."
            exit 1
        }

        Start-Sleep -Seconds 1
        $count++
    }

    Write-ErrorMsg "Backend did not start within 60 seconds."
    exit 1
}

# ------------------------------------------------------------
# Frontend
#
# Current frontend is a React SPA built with Vite.
# Requires Node.js / npm.
# ------------------------------------------------------------

function Start-Frontend {

    Test-RequiredCommand "npm"
    Test-RequiredCommand "npx"

    if (-not (Test-Path $FrontendDir)) {
        Write-ErrorMsg "Frontend directory not found:"
        Write-ErrorMsg "$FrontendDir"
        exit 1
    }

    if (-not (Test-Path (Join-Path $FrontendDir "package.json"))) {
        Write-ErrorMsg "frontend/package.json not found."
        exit 1
    }

    if (Test-PortInUse $FrontendPort) {
        Write-Warn "Port $FrontendPort is already in use."
        Write-Warn "Frontend may already be running."
        Write-Info "Frontend: http://localhost:$FrontendPort"
        return
    }

    Write-Info "Starting WeatherGPT Frontend (Vite dev server)..."

    $script:FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev", "--", "--port", "$FrontendPort" `
        -WorkingDirectory $FrontendDir -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput "$env:TEMP\weathergpt-frontend.log" `
        -RedirectStandardError "$env:TEMP\weathergpt-frontend.err.log"

    Write-Info "Waiting for frontend on port $FrontendPort..."

    $count = 0
    while ($count -lt 30) {

        if (Test-PortInUse $FrontendPort) {
            Write-Success "Frontend started!"
            Write-Success "Frontend: http://localhost:$FrontendPort"
            return
        }

        if ($script:FrontendProcess.HasExited) {
            Write-ErrorMsg "Frontend process stopped unexpectedly."
            exit 1
        }

        Start-Sleep -Seconds 1
        $count++
    }

    Write-ErrorMsg "Frontend did not start within 30 seconds."
    exit 1
}

# ------------------------------------------------------------
# Run tests
# ------------------------------------------------------------

function Invoke-Tests {

    Test-RequiredCommand "mvn"

    Write-Info "Running WeatherGPT Backend Tests..."

    Push-Location $BackendDir
    try {
        mvn clean test
    } finally {
        Pop-Location
    }

    Write-Success "All backend tests completed."
}

# ------------------------------------------------------------
# Build backend
# ------------------------------------------------------------

function Build-Backend {

    Test-RequiredCommand "mvn"

    Write-Info "Building WeatherGPT Backend..."

    Push-Location $BackendDir
    try {
        mvn clean package -DskipTests
    } finally {
        Pop-Location
    }

    Write-Success "Backend build completed."
}

# ------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------

function Build-Frontend {

    Test-RequiredCommand "npm"

    Write-Info "Building WeatherGPT Frontend..."

    Push-Location $FrontendDir
    try {
        npm run build
    } finally {
        Pop-Location
    }

    Write-Success "Frontend build completed."
}

# ------------------------------------------------------------
# Stop services
# ------------------------------------------------------------

function Stop-Services {

    Write-Info "Stopping services..."

    Stop-Port $BackendPort
    Stop-Port $FrontendPort

    Write-Success "WeatherGPT services stopped."
}

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

switch ($Command) {

    "start" {
        Write-Host ""
        Write-Host "============================================================"
        Write-Host "                 WEATHERGPT STARTUP"
        Write-Host "============================================================"
        Write-Host ""

        try {
            Invoke-OllamaPull
            Start-Backend
            Start-Frontend

            Write-Host ""
            Write-Success "WeatherGPT is running!"
            Write-Host ""

            Write-Host "Backend:"
            Write-Host "  http://localhost:$BackendPort"
            Write-Host ""

            Write-Host "Frontend (React + Vite):"
            Write-Host "  http://localhost:$FrontendPort"
            Write-Host ""

            Write-Host "Press Ctrl+C to stop services."
            Write-Host ""

            while ($true) {
                Start-Sleep -Seconds 60

                if ($script:BackendProcess -and $script:BackendProcess.HasExited) {
                    Write-ErrorMsg "Backend process stopped."
                    break
                }

                if ($script:FrontendProcess -and $script:FrontendProcess.HasExited) {
                    Write-ErrorMsg "Frontend process stopped."
                    break
                }
            }
        } finally {
            Invoke-Cleanup
        }
    }

    "backend" {
        try {
            Invoke-OllamaPull
            Start-Backend
            if ($script:BackendProcess) { Wait-Process -Id $script:BackendProcess.Id }
        } finally {
            Invoke-Cleanup
        }
    }

    "frontend" {
        try {
            Start-Frontend
            if ($script:FrontendProcess) { Wait-Process -Id $script:FrontendProcess.Id }
        } finally {
            Invoke-Cleanup
        }
    }

    "setup" {
        Invoke-Setup
    }

    "test" {
        Invoke-Tests
    }

    "build" {
        Build-Backend
        Build-Frontend
    }

    "stop" {
        Stop-Services
    }

    default {
        Write-ErrorMsg "Unknown command: $Command"

        Write-Host ""
        Write-Host "Usage:"
        Write-Host "  .\start.ps1"
        Write-Host "  .\start.ps1 backend"
        Write-Host "  .\start.ps1 frontend"
        Write-Host "  .\start.ps1 setup"
        Write-Host "  .\start.ps1 test"
        Write-Host "  .\start.ps1 build"
        Write-Host "  .\start.ps1 stop"

        exit 1
    }
}

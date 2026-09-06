#!/usr/bin/env sh

# ============================================================
# WeatherGPT - Universal Startup Script
#
# Compatible with:
#   bash
#   zsh
#   fish  -> fish start.sh
#   sh
#
# Usage:
#   ./start.sh
#   sh start.sh
#   bash start.sh
#   zsh start.sh
#   fish start.sh
#
# Commands:
#   ./start.sh          Start backend + frontend test console
#   ./start.sh backend  Start backend only
#   ./start.sh frontend Start frontend only
#   ./start.sh setup    Install deps + pull Ollama model (full project setup)
#   ./start.sh test     Run backend tests
#   ./start.sh build    Build backend
#   ./start.sh stop     Stop WeatherGPT processes started on ports
#
# Environment overrides:
#   OLLAMA_MODEL   Ollama model to pull/use (default: llama3.2)
# ============================================================

set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

BACKEND_PORT=8080
FRONTEND_PORT=3000
OLLAMA_PORT=11434

# NOTE: change the default here (or export OLLAMA_MODEL before running)
# to match whichever model your WeatherGPT backend actually expects.
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2}"

BACKEND_PID=""
FRONTEND_PID=""
OLLAMA_PID=""

# ------------------------------------------------------------
# Colors
# ------------------------------------------------------------

if [ -t 1 ]; then
    RED="$(printf '\033[0;31m')"
    GREEN="$(printf '\033[0;32m')"
    YELLOW="$(printf '\033[1;33m')"
    BLUE="$(printf '\033[0;34m')"
    NC="$(printf '\033[0m')"
else
    RED=""
    GREEN=""
    YELLOW=""
    BLUE=""
    NC=""
fi

info() {
    printf "%s[INFO]%s %s\n" "$BLUE" "$NC" "$1"
}

success() {
    printf "%s[SUCCESS]%s %s\n" "$GREEN" "$NC" "$1"
}

warn() {
    printf "%s[WARNING]%s %s\n" "$YELLOW" "$NC" "$1"
}

error() {
    printf "%s[ERROR]%s %s\n" "$RED" "$NC" "$1"
}

# ------------------------------------------------------------
# Check command availability
# ------------------------------------------------------------

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        error "Required command not found: $1"
        exit 1
    fi
}

# ------------------------------------------------------------
# Find process using a port
# ------------------------------------------------------------

port_in_use() {
    PORT="$1"

    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":$PORT" >/dev/null 2>&1
        return $?
    fi

    if command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | grep -q ":$PORT "
        return $?
    fi

    return 1
}

# ------------------------------------------------------------
# Stop process running on a port
# ------------------------------------------------------------

stop_port() {
    PORT="$1"

    if command -v lsof >/dev/null 2>&1; then
        PIDS="$(lsof -ti ":$PORT" 2>/dev/null || true)"

        if [ -n "$PIDS" ]; then
            warn "Stopping process on port $PORT..."

            for PID in $PIDS; do
                kill "$PID" 2>/dev/null || true
            done

            sleep 1

            PIDS="$(lsof -ti ":$PORT" 2>/dev/null || true)"

            if [ -n "$PIDS" ]; then
                for PID in $PIDS; do
                    kill -9 "$PID" 2>/dev/null || true
                done
            fi

            success "Port $PORT is now free."
        fi
    else
        warn "lsof not available. Cannot automatically stop port $PORT."
    fi
}

# ------------------------------------------------------------
# Cleanup when Ctrl+C is pressed
# ------------------------------------------------------------

cleanup() {
    printf "\n"

    info "Stopping WeatherGPT..."

    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    if [ -n "$OLLAMA_PID" ]; then
        kill "$OLLAMA_PID" 2>/dev/null || true
    fi

    success "WeatherGPT stopped."
    exit 0
}

trap cleanup INT TERM

# ------------------------------------------------------------
# Ollama
# ------------------------------------------------------------

pull_ollama_model() {

    if ! command -v ollama >/dev/null 2>&1; then
        warn "Ollama is not installed. Skipping model pull."
        return
    fi

    info "Ensuring Ollama model '$OLLAMA_MODEL' is available..."

    if ollama pull "$OLLAMA_MODEL"; then
        success "Ollama model '$OLLAMA_MODEL' ready."
        return
    fi

    warn "Ollama pull failed. Attempting to start the Ollama server..."

    if port_in_use "$OLLAMA_PORT"; then
        warn "Ollama already appears to be running on port $OLLAMA_PORT, but the pull still failed."
        warn "Continuing anyway since Ollama is already up - it may already have the model, or you may be managing it yourself."
        return
    fi

    (
        ollama serve
    ) >/tmp/weathergpt-ollama.log 2>&1 &

    OLLAMA_PID=$!

    COUNT=0

    while [ "$COUNT" -lt 30 ]; do
        if port_in_use "$OLLAMA_PORT"; then
            break
        fi

        if ! kill -0 "$OLLAMA_PID" 2>/dev/null; then
            warn "Ollama server failed to start. See /tmp/weathergpt-ollama.log"
            warn "Continuing without confirming the Ollama model - the backend may fail if it needs it."
            return
        fi

        sleep 1
        COUNT=$((COUNT + 1))
    done

    if ! ollama pull "$OLLAMA_MODEL"; then
        warn "Could not pull Ollama model '$OLLAMA_MODEL' even after starting the server."
        warn "Continuing anyway - the backend may fail if it needs this model."
        return
    fi

    success "Ollama model '$OLLAMA_MODEL' ready."
}

# ------------------------------------------------------------
# Full project setup (dependencies + model)
# ------------------------------------------------------------

setup_project() {

    require_command mvn
    require_command npm

    printf "\n"
    printf "============================================================\n"
    printf "                 WEATHERGPT SETUP\n"
    printf "============================================================\n"
    printf "\n"

    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR" ]; then
        error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi

    info "Installing backend dependencies (Maven)..."

    (
        cd "$BACKEND_DIR"
        mvn -q dependency:resolve
    )

    success "Backend dependencies resolved."

    info "Installing frontend dependencies (npm)..."

    (
        cd "$FRONTEND_DIR"
        npm install
    )

    success "Frontend dependencies installed."

    pull_ollama_model

    printf "\n"
    success "WeatherGPT setup complete."
    printf "\n"
}

# ------------------------------------------------------------
# Backend
# ------------------------------------------------------------

start_backend() {

    require_command java
    require_command mvn

    if [ ! -d "$BACKEND_DIR" ]; then
        error "Backend directory not found:"
        error "$BACKEND_DIR"
        exit 1
    fi

    if [ ! -f "$BACKEND_DIR/pom.xml" ]; then
        error "pom.xml not found in backend directory."
        exit 1
    fi

    if port_in_use "$BACKEND_PORT"; then
        warn "Port $BACKEND_PORT is already in use."
        warn "Assuming WeatherGPT backend may already be running."
        info "Backend URL: http://localhost:$BACKEND_PORT"
        return
    fi

    info "Starting WeatherGPT Backend..."

    (
        cd "$BACKEND_DIR"

        mvn spring-boot:run
    ) &

    BACKEND_PID=$!

    info "Waiting for backend on port $BACKEND_PORT..."

    COUNT=0

    while [ "$COUNT" -lt 60 ]; do

        if port_in_use "$BACKEND_PORT"; then
            success "WeatherGPT Backend started!"
            success "Backend: http://localhost:$BACKEND_PORT"
            return
        fi

        if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
            error "Backend process stopped unexpectedly."
            exit 1
        fi

        sleep 1
        COUNT=$((COUNT + 1))
    done

    error "Backend did not start within 60 seconds."
    exit 1
}

# ------------------------------------------------------------
# Frontend
#
# Current frontend is a React SPA built with Vite.
# Requires Node.js / npm.
# ------------------------------------------------------------

start_frontend() {

    require_command npm
    require_command npx

    if [ ! -d "$FRONTEND_DIR" ]; then
        error "Frontend directory not found:"
        error "$FRONTEND_DIR"
        exit 1
    fi

    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        error "frontend/package.json not found."
        exit 1
    fi

    if port_in_use "$FRONTEND_PORT"; then
        warn "Port $FRONTEND_PORT is already in use."
        warn "Frontend may already be running."
        info "Frontend: http://localhost:$FRONTEND_PORT"
        return
    fi

    info "Starting WeatherGPT Frontend (Vite dev server)..."

    (
        cd "$FRONTEND_DIR"

        npm run dev -- --port "$FRONTEND_PORT"
    ) &

    FRONTEND_PID=$!

    info "Waiting for frontend on port $FRONTEND_PORT..."

    COUNT=0

    while [ "$COUNT" -lt 30 ]; do

        if port_in_use "$FRONTEND_PORT"; then
            success "Frontend started!"
            success "Frontend: http://localhost:$FRONTEND_PORT"
            return
        fi

        if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
            error "Frontend process stopped unexpectedly."
            exit 1
        fi

        sleep 1
        COUNT=$((COUNT + 1))
    done

    error "Frontend did not start within 30 seconds."
    exit 1
}

# ------------------------------------------------------------
# Run tests
# ------------------------------------------------------------

run_tests() {

    require_command mvn

    info "Running WeatherGPT Backend Tests..."

    cd "$BACKEND_DIR"

    mvn clean test

    success "All backend tests completed."
}

# ------------------------------------------------------------
# Build backend
# ------------------------------------------------------------

build_backend() {

    require_command mvn

    info "Building WeatherGPT Backend..."

    cd "$BACKEND_DIR"

    mvn clean package -DskipTests

    success "Backend build completed."
}

# ------------------------------------------------------------
# Build frontend
# ------------------------------------------------------------

build_frontend() {

    require_command npm

    info "Building WeatherGPT Frontend..."

    cd "$FRONTEND_DIR"

    npm run build

    success "Frontend build completed."
}

# ------------------------------------------------------------
# Stop services
# ------------------------------------------------------------

stop_services() {

    info "Stopping services..."

    stop_port "$BACKEND_PORT"
    stop_port "$FRONTEND_PORT"

    success "WeatherGPT services stopped."
}

# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

COMMAND="${1:-start}"

case "$COMMAND" in

    start)
        printf "\n"
        printf "============================================================\n"
        printf "                 WEATHERGPT STARTUP\n"
        printf "============================================================\n"
        printf "\n"

        pull_ollama_model
        start_backend
        start_frontend

        printf "\n"
        success "WeatherGPT is running!"
        printf "\n"

        printf "Backend:\n"
        printf "  http://localhost:%s\n\n" "$BACKEND_PORT"

        printf "Frontend (React + Vite):\n"
        printf "  http://localhost:%s\n\n" "$FRONTEND_PORT"

        printf "Press Ctrl+C to stop services.\n"
        printf "\n"

        # Keep script alive when processes were started here
        while true; do
            sleep 60

            if [ -n "$BACKEND_PID" ] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
                error "Backend process stopped."
                cleanup
            fi

            if [ -n "$FRONTEND_PID" ] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
                error "Frontend process stopped."
                cleanup
            fi
        done
        ;;

    backend)
        pull_ollama_model
        start_backend

        if [ -n "$BACKEND_PID" ]; then
            wait "$BACKEND_PID"
        fi
        ;;

    frontend)
        start_frontend

        if [ -n "$FRONTEND_PID" ]; then
            wait "$FRONTEND_PID"
        fi
        ;;

    setup)
        setup_project
        ;;

    test)
        run_tests
        ;;

    build)
        build_backend
        build_frontend
        ;;

    stop)
        stop_services
        ;;

    *)
        error "Unknown command: $COMMAND"

        printf "\nUsage:\n"
        printf "  ./start.sh\n"
        printf "  ./start.sh backend\n"
        printf "  ./start.sh frontend\n"
        printf "  ./start.sh setup\n"
        printf "  ./start.sh test\n"
        printf "  ./start.sh build\n"
        printf "  ./start.sh stop\n"

        exit 1
        ;;
esac

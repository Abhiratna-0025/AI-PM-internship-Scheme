#!/usr/bin/env fish
# WeatherGPT — fish frontend for the POSIX start.sh
#
# This wrapper lets fish users type things like:
#   ./start.fish
#   ./start.fish backend
#   ./start.fish setup
#   ./start.fish stop
#
# and have them behave the same as the POSIX script while avoiding
# the shell-compatibility pitfalls of running start.sh directly under
# fish. The actual startup logic lives in start.sh.
#
# Environment overrides work the same way as start.sh:
#   set -x OLLAMA_MODEL llama3.2
#   set -x VOICE_ENABLED true

set -l script_dir (dirname (status filename))
set -l posix_script "$script_dir/start.sh"

if test ! -f "$posix_script"
    echo "[ERROR] start.sh not found next to start.fish: $posix_script" >&2
    exit 1
end

# Parse global flags before forwarding
set -l command "$argv[1]"
set -l have_command false

if test "$command" = "--help";or test "$command" = "-h"
    echo ""
    echo "WeatherGPT - Fish startup wrapper"
    echo "=================================="
    echo ""
    echo "Usage: ./start.fish [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  (no args)  Start backend + frontend"
    echo "  backend    Start backend only"
    echo "  frontend   Start frontend only"
    echo "  voice      Start voice service only"
    echo "  setup      Install deps + pull Ollama model"
    echo "  test       Run backend tests"
    echo "  build      Build backend + frontend"
    echo "  stop       Stop all WeatherGPT services"
    echo "  status     Show running services"
    echo "  --help     Show this help"
    echo ""
    echo "Runs start.sh under sh(1). Set env vars like:"
    echo "  set -x OLLAMA_MODEL llama3.2"
    echo "  set -x VOICE_ENABLED true"
    exit 0
end

# For status command, show nice fish-style output directly
if test "$command" = "status"
    echo ""
    echo "============================================================"
    echo "                 WEATHERGPT STATUS"
    echo "============================================================"
    echo ""

    set -l any_running false

    if lsof -i :8080 >/dev/null 2>&1
        set any_running true
        echo (string pad -n 20 "Backend:") "http://localhost:8080 (running)"
    else
        echo (string pad -n 20 "Backend:") "not running"
    end

    if lsof -i :3000 >/dev/null 2>&1
        set any_running true
        echo (string pad -n 20 "Frontend:") "http://localhost:3000 (running)"
    else
        echo (string pad -n 20 "Frontend:") "not running"
    end

    if lsof -i :8001 >/dev/null 2>&1
        set any_running true
        echo (string pad -n 20 "Voice Service:") "http://localhost:8001 (running)"
    else
        echo (string pad -n 20 "Voice Service:") "not running"
    end

    if lsof -i :11434 >/dev/null 2>&1
        echo (string pad -n 20 "Ollama:") "running on port 11434"
    else
        echo (string pad -n 20 "Ollama:") "not running"
    end

    if not $any_running
        echo ""
        echo "No WeatherGPT services are currently running."
    end

    echo ""
    exit 0
end

# Forward remaining arguments verbatim to the POSIX script.
# The POSIX script handles its own signal traps, background jobs, etc.
if test "$command" = "--".or test "$command" = "-n".or test "$command" = "-v"
    # Flag-only invocation: pass everything including the flag
    exec sh "$posix_script" $argv
else if test -n "$command"
    # Command + args: shift off the command
    set -l rest $argv[2..-1]
    exec sh "$posix_script" $command $rest
else
    # No args: default to start
    exec sh "$posix_script" start
end

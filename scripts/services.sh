#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime"
LOG_DIR="$RUNTIME_DIR/logs"
PID_DIR="$RUNTIME_DIR/pids"

API_PID_FILE="$PID_DIR/api.pid"
WEB_PID_FILE="$PID_DIR/web.pid"

API_URL="http://localhost:3000/api/health"
WEB_URL="http://localhost:5173"

mkdir -p "$LOG_DIR" "$PID_DIR"

cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/services.sh start         Start Postgres/Redis in Docker, API/Web locally
  ./scripts/services.sh stop          Stop local API/Web and Docker Postgres/Redis
  ./scripts/services.sh restart       Restart local development services
  ./scripts/services.sh status        Show service status
  ./scripts/services.sh logs [name]   Tail logs: api | web | postgres | redis | all

  ./scripts/services.sh docker-start  Start all services with docker compose
  ./scripts/services.sh docker-stop   Stop all docker compose services
  ./scripts/services.sh docker-logs   Tail docker compose logs

Examples:
  ./scripts/services.sh start
  ./scripts/services.sh logs api
  ./scripts/services.sh stop
EOF
}

info() {
  printf '\033[1;34m[myphone]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[myphone]\033[0m %s\n' "$*"
}

fail() {
  printf '\033[1;31m[myphone]\033[0m %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing command: $1"
}

compose() {
  docker compose "$@"
}

is_pid_running() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] || return 1

  local pid
  pid="$(cat "$pid_file")"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

is_url_ready() {
  local url="$1"
  curl -fsS "$url" >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local name="$2"
  local max_attempts="${3:-60}"

  for ((attempt = 1; attempt <= max_attempts; attempt += 1)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      info "$name is ready: $url"
      return 0
    fi
    sleep 1
  done

  warn "$name did not respond in time: $url"
  return 1
}

start_infra() {
  require_command docker
  info "Starting Postgres and Redis..."
  compose up -d postgres redis
}

start_api() {
  require_command pnpm

  if is_pid_running "$API_PID_FILE"; then
    if is_url_ready "$API_URL"; then
      info "API is already running, pid $(cat "$API_PID_FILE")"
      return
    fi
    warn "API pid exists but health check failed; restarting it."
    stop_pid "API" "$API_PID_FILE"
  fi

  info "Preparing Prisma client and migrations..."
  pnpm --filter api exec dotenv -e ../../.env -- prisma generate --schema prisma/schema.prisma
  pnpm --filter api exec dotenv -e ../../.env -- prisma migrate deploy --schema prisma/schema.prisma

  info "Starting API..."
  nohup env CORS_ORIGIN="http://localhost:5173,http://localhost:15173" pnpm --filter api dev >"$LOG_DIR/api.log" 2>&1 &
  echo "$!" >"$API_PID_FILE"
  if ! wait_for_url "$API_URL" "API" 90; then
    warn "API failed to become healthy. Last log lines:"
    tail -n 80 "$LOG_DIR/api.log" || true
    stop_pid "API" "$API_PID_FILE"
    return 1
  fi
}

start_web() {
  require_command pnpm

  if is_pid_running "$WEB_PID_FILE"; then
    if is_url_ready "$WEB_URL"; then
      info "Web is already running, pid $(cat "$WEB_PID_FILE")"
      return
    fi
    warn "Web pid exists but page check failed; restarting it."
    stop_pid "Web" "$WEB_PID_FILE"
  fi

  info "Starting Web..."
  nohup pnpm --filter web dev >"$LOG_DIR/web.log" 2>&1 &
  echo "$!" >"$WEB_PID_FILE"
  if ! wait_for_url "$WEB_URL" "Web" 60; then
    warn "Web failed to become ready. Last log lines:"
    tail -n 80 "$LOG_DIR/web.log" || true
    stop_pid "Web" "$WEB_PID_FILE"
    return 1
  fi
}

start_local() {
  start_infra
  start_api
  start_web

  info "All local development services started."
  info "Web: http://localhost:5173"
  info "API: http://localhost:3000/api"
  info "Postgres: localhost:15432"
  info "Redis: localhost:16379"
}

stop_pid() {
  local name="$1"
  local pid_file="$2"

  if ! [[ -f "$pid_file" ]]; then
    info "$name is not running."
    return
  fi

  local pid
  pid="$(cat "$pid_file")"

  if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
    info "Stopping $name, pid $pid..."
    kill "$pid" >/dev/null 2>&1 || true
    for _ in {1..20}; do
      kill -0 "$pid" >/dev/null 2>&1 || break
      sleep 0.2
    done
    kill -9 "$pid" >/dev/null 2>&1 || true
  else
    info "$name pid is stale."
  fi

  rm -f "$pid_file"
}

stop_local() {
  stop_pid "Web" "$WEB_PID_FILE"
  stop_pid "API" "$API_PID_FILE"

  info "Stopping Postgres and Redis..."
  compose stop postgres redis
  info "Local development services stopped."
}

status_local() {
  if is_pid_running "$API_PID_FILE" && is_url_ready "$API_URL"; then
    info "API: running, pid $(cat "$API_PID_FILE"), health ok"
  elif is_pid_running "$API_PID_FILE"; then
    warn "API: pid $(cat "$API_PID_FILE") exists, but health check failed"
  else
    warn "API: stopped"
  fi

  if is_pid_running "$WEB_PID_FILE" && is_url_ready "$WEB_URL"; then
    info "Web: running, pid $(cat "$WEB_PID_FILE"), page ok"
  elif is_pid_running "$WEB_PID_FILE"; then
    warn "Web: pid $(cat "$WEB_PID_FILE") exists, but page check failed"
  else
    warn "Web: stopped"
  fi

  compose ps postgres redis
}

tail_logs() {
  local name="${1:-all}"

  case "$name" in
    api)
      tail -n 200 -f "$LOG_DIR/api.log"
      ;;
    web)
      tail -n 200 -f "$LOG_DIR/web.log"
      ;;
    postgres|redis)
      compose logs -f --tail=200 "$name"
      ;;
    all)
      tail -n 120 -f "$LOG_DIR/api.log" "$LOG_DIR/web.log" &
      local tail_pid="$!"
      compose logs -f --tail=120 postgres redis &
      local compose_pid="$!"
      trap 'kill "$tail_pid" "$compose_pid" >/dev/null 2>&1 || true' INT TERM EXIT
      wait
      ;;
    *)
      fail "Unknown log target: $name"
      ;;
  esac
}

docker_start() {
  require_command docker
  info "Starting all services with docker compose..."
  compose up -d --build
  info "Docker services started."
  info "Web: http://localhost:15173"
  info "API: http://localhost:3000/api"
}

docker_stop() {
  require_command docker
  info "Stopping all docker compose services..."
  compose down
  info "Docker services stopped."
}

case "${1:-}" in
  start)
    start_local
    ;;
  stop)
    stop_local
    ;;
  restart)
    stop_local
    start_local
    ;;
  status)
    status_local
    ;;
  logs)
    tail_logs "${2:-all}"
    ;;
  docker-start)
    docker_start
    ;;
  docker-stop)
    docker_stop
    ;;
  docker-logs)
    compose logs -f --tail=200
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    usage
    fail "Unknown command: $1"
    ;;
esac

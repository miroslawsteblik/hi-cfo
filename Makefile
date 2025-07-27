.PHONY: help dev dev-build dev-detached dev-logs dev-restart prod prod-build prod-deploy prod-logs test test-network down clean logs ps health shell-api shell-db migrate backup restore status debug-env

# Colors for better output
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
BLUE := \033[34m
RESET := \033[0m

# Docker Compose file combinations
DEV_FILES := -f docker-compose.yml -f docker-compose.dev.yml
PROD_FILES := -f docker-compose.yml -f docker-compose.prod.yml

# Environment files
DEV_ENV := --env-file .env.development
PROD_ENV := --env-file .env.production

# Combined commands
DEV_CMD := docker compose $(DEV_FILES) $(DEV_ENV)
PROD_CMD := docker compose $(PROD_FILES) $(PROD_ENV)

# Default target
help:
	@echo "$(BLUE)🚀 Available Commands:$(RESET)"
	@echo ""
	@echo "$(GREEN)📋 Development Commands:$(RESET)"
	@echo "  dev              - Start development environment"
	@echo "  dev-build        - Build and start development environment"
	@echo "  dev-detached     - Start development environment in background"
	@echo "  dev-logs         - Follow development logs"
	@echo "  dev-restart      - Restart development services"
	@echo "  dev-down         - Stop development environment"
	@echo ""
	@echo "$(GREEN)🏭 Production Commands:$(RESET)"
	@echo "  prod             - Start production environment"
	@echo "  prod-build       - Build and start production environment"
	@echo "  prod-deploy      - Deploy to production (pull + build + start)"
	@echo "  prod-logs        - Follow production logs"
	@echo "  prod-restart     - Restart production services"
	@echo "  prod-down        - Stop production environment"
	@echo ""
	@echo "$(GREEN)🧪 Testing & Database:$(RESET)"
	@echo "  test             - Run tests"
	@echo "  migrate-up       - Run database migrations up"
	@echo "  migrate-down     - Rollback last migration"
	@echo "  backup           - Create database backup"
	@echo "  restore          - Restore database from backup"
	@echo ""
	@echo "$(GREEN)🔧 Utility Commands:$(RESET)"
	@echo "  logs             - Show logs from current environment"
	@echo "  ps               - Show running containers"
	@echo "  health           - Check service health"
	@echo "  status           - Show detailed environment status"
	@echo "  debug-env        - Debug environment configuration issues"
	@echo "  shell-api        - Shell into backend container"
	@echo "  shell-db         - Shell into database container"
	@echo "  down             - Stop all environments"
	@echo "  clean            - Clean up everything"
	@echo ""
	@echo "$(GREEN)📊 Monitoring (Production):$(RESET)"
	@echo "  monitor          - Open monitoring dashboards"
	@echo "  ssl-renew        - Renew SSL certificates"

# =============================================================================
# DEVELOPMENT COMMANDS
# =============================================================================

dev:
	@echo "$(GREEN)🚀 Starting development environment...$(RESET)"
	$(DEV_CMD) up

dev-build:
	@echo "$(GREEN)🔨 Building and starting development environment...$(RESET)"
	$(DEV_CMD) up --build

dev-detached:
	@echo "$(GREEN)🚀 Starting development environment in background...$(RESET)"
	$(DEV_CMD) up -d

dev-logs:
	@echo "$(GREEN)📋 Following development logs...$(RESET)"
	$(DEV_CMD) logs -f

dev-restart:
	@echo "$(YELLOW)🔄 Restarting development services...$(RESET)"
	$(DEV_CMD) restart

dev-down:
	@echo "$(YELLOW)🛑 Stopping development environment...$(RESET)"
	$(DEV_CMD) down

# Development service-specific commands
dev-restart-api:
	@echo "$(YELLOW)🔄 Restarting backend service...$(RESET)"
	$(DEV_CMD) restart backend

dev-restart-frontend:
	@echo "$(YELLOW)🔄 Restarting frontend service...$(RESET)"
	$(DEV_CMD) restart frontend

dev-restart-nginx:
	@echo "$(YELLOW)🔄 Restarting nginx service...$(RESET)"
	$(DEV_CMD) restart nginx

# =============================================================================
# PRODUCTION COMMANDS
# =============================================================================

prod:
	@echo "$(GREEN)🏭 Starting production environment...$(RESET)"
	$(PROD_CMD) up -d

prod-build:
	@echo "$(GREEN)🔨 Building and starting production environment...$(RESET)"
	$(PROD_CMD) up -d --build

prod-deploy:
	@echo "$(GREEN)🚀 Deploying to production...$(RESET)"
	@echo "$(YELLOW)Pulling latest images...$(RESET)"
	$(PROD_CMD) pull
	@echo "$(YELLOW)Building and starting services...$(RESET)"
	$(PROD_CMD) up -d --build
	@echo "$(GREEN)✅ Production deployment complete!$(RESET)"
	@echo "$(BLUE)💡 Run 'make prod-logs' to monitor the deployment$(RESET)"

prod-logs:
	@echo "$(GREEN)📋 Following production logs...$(RESET)"
	$(PROD_CMD) logs -f

prod-restart:
	@echo "$(YELLOW)🔄 Restarting production services...$(RESET)"
	$(PROD_CMD) restart

prod-down:
	@echo "$(YELLOW)🛑 Stopping production environment...$(RESET)"
	$(PROD_CMD) down

# Production scaling
prod-scale:
	@echo "$(GREEN)📈 Scaling production services...$(RESET)"
	$(PROD_CMD) up -d --scale backend=2 --scale frontend=2

# =============================================================================
# TESTING & DATABASE COMMANDS
# =============================================================================

test:
	@echo "$(GREEN)🧪 Running tests...$(RESET)"
	$(DEV_CMD) exec backend go test ./... -v

test-integration:
	@echo "$(GREEN)🧪 Running integration tests...$(RESET)"
	$(DEV_CMD) exec backend go test ./tests/integration/... -v

# Database migrations
migrate-up:
	@echo "$(GREEN)⬆️  Running database migrations up...$(RESET)"
	$(DEV_CMD) exec backend migrate -path ./migrations -database "$$DATABASE_URL" up

migrate-down:
	@echo "$(YELLOW)⬇️  Rolling back last migration...$(RESET)"
	@read -p "Are you sure? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DEV_CMD) exec backend migrate -path ./migrations -database "$$DATABASE_URL" down 1

migrate-force:
	@echo "$(RED)⚠️  Force setting migration version...$(RESET)"
	@read -p "Enter migration version: " version; \
	read -p "Are you sure? This can break your database! (y/N): " confirm; \
	[ "$$confirm" = "y" ] && $(DEV_CMD) exec backend migrate -path ./migrations -database "$$DATABASE_URL" force $$version

# Database backup and restore
backup:
	@echo "$(GREEN)💾 Creating database backup...$(RESET)"
	@mkdir -p ./backup
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	$(DEV_CMD) exec postgres pg_dump -U $${DB_USER:-admin} $${DB_NAME:-hicfo} > ./backup/backup_$$timestamp.sql && \
	echo "$(GREEN)✅ Backup created: ./backup/backup_$$timestamp.sql$(RESET)"

restore:
	@echo "$(YELLOW)📥 Restoring database from backup...$(RESET)"
	@echo "$(BLUE)Available backups:$(RESET)"
	@ls -la ./backup/ | grep -E '\.sql$$' || echo "No backup files found"
	@read -p "Enter backup filename (with .sql extension): " filename; \
	read -p "This will overwrite the current database. Continue? (y/N): " confirm; \
	[ "$$confirm" = "y" ] && $(DEV_CMD) exec -T postgres psql -U $${DB_USER:-admin} -d $${DB_NAME:-hicfo} < ./backup/$$filename

test-network:
	@echo "$(GREEN)🌐 Testing network connectivity...$(RESET)"
	docker network ls
	docker network inspect hi-cfo_backend-network

# =============================================================================
# UTILITY COMMANDS
# =============================================================================

logs:
	@if [ -f .env.development ] && docker compose $(DEV_FILES) ps -q | grep -q .; then \
		echo "$(GREEN)📋 Showing development logs...$(RESET)"; \
		$(DEV_CMD) logs -f; \
	elif [ -f .env.production ] && docker compose $(PROD_FILES) ps -q | grep -q .; then \
		echo "$(GREEN)📋 Showing production logs...$(RESET)"; \
		$(PROD_CMD) logs -f; \
	else \
		echo "$(RED)❌ No running environment detected$(RESET)"; \
	fi

logs-api:
	@if docker compose $(DEV_FILES) ps -q backend | grep -q .; then \
		$(DEV_CMD) logs -f backend; \
	else \
		$(PROD_CMD) logs -f backend; \
	fi

logs-frontend:
	@if docker compose $(DEV_FILES) ps -q frontend | grep -q .; then \
		$(DEV_CMD) logs -f frontend; \
	else \
		$(PROD_CMD) logs -f frontend; \
	fi

logs-nginx:
	@if docker compose $(DEV_FILES) ps -q nginx | grep -q .; then \
		$(DEV_CMD) logs -f nginx; \
	else \
		$(PROD_CMD) logs -f nginx; \
	fi

ps:
	@echo "$(GREEN)📋 Development Environment:$(RESET)"
	@$(DEV_CMD) ps 2>/dev/null || echo "Not running"
	@echo ""
	@echo "$(GREEN)📋 Production Environment:$(RESET)"
	@$(PROD_CMD) ps 2>/dev/null || echo "Not running"

health:
	@echo "$(GREEN)🏥 Checking service health...$(RESET)"
	@echo "$(BLUE)Development:$(RESET)"
	@$(DEV_CMD) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Not running"
	@echo ""
	@echo "$(BLUE)Production:$(RESET)"
	@$(PROD_CMD) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Not running"

# Shell access
shell-api:
	@if docker compose $(DEV_FILES) ps -q backend | grep -q .; then \
		echo "$(GREEN)🐚 Opening development backend shell...$(RESET)"; \
		$(DEV_CMD) exec backend sh; \
	else \
		echo "$(GREEN)🐚 Opening production backend shell...$(RESET)"; \
		$(PROD_CMD) exec backend sh; \
	fi

shell-db:
	@if docker compose $(DEV_FILES) ps -q postgres | grep -q .; then \
		echo "$(GREEN)🐚 Opening development database shell...$(RESET)"; \
		$(DEV_CMD) exec postgres psql -U $${DB_USER:-admin} -d $${DB_NAME:-hicfo}; \
	else \
		echo "$(GREEN)🐚 Opening production database shell...$(RESET)"; \
		$(PROD_CMD) exec postgres psql -U $${DB_USER:-admin} -d $${DB_NAME:-hicfo}; \
	fi

shell-redis:
	@if docker compose $(DEV_FILES) ps -q redis | grep -q .; then \
		echo "$(GREEN)🐚 Opening development Redis shell...$(RESET)"; \
		$(DEV_CMD) exec redis redis-cli -a $${REDIS_PASSWORD}; \
	else \
		echo "$(GREEN)🐚 Opening production Redis shell...$(RESET)"; \
		$(PROD_CMD) exec redis redis-cli -a $${REDIS_PASSWORD}; \
	fi

# =============================================================================
# CLEANUP COMMANDS
# =============================================================================

down:
	@echo "$(YELLOW)🛑 Stopping all environments...$(RESET)"
	$(DEV_CMD) down 2>/dev/null || true
	$(PROD_CMD) down 2>/dev/null || true

clean:
	@echo "$(RED)🧹 Cleaning up everything...$(RESET)"
	@read -p "This will remove all containers, images, and volumes. Continue? (y/N): " confirm; \
	[ "$$confirm" = "y" ] || exit 1
	$(DEV_CMD) down -v --remove-orphans 2>/dev/null || true
	$(PROD_CMD) down -v --remove-orphans 2>/dev/null || true
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Cleanup complete!$(RESET)"

clean-soft:
	@echo "$(YELLOW)🧹 Soft cleanup (containers only)...$(RESET)"
	$(DEV_CMD) down --remove-orphans 2>/dev/null || true
	$(PROD_CMD) down --remove-orphans 2>/dev/null || true
	docker container prune -f

# =============================================================================
# MONITORING & SSL (Production)
# =============================================================================

monitor:
	@echo "$(GREEN)📊 Opening monitoring dashboards...$(RESET)"
	@echo "$(BLUE)Available dashboards:$(RESET)"
	@echo "  Grafana:    http://localhost:3001 (admin/admin)"
	@echo "  Prometheus: http://localhost:9090"
	@echo "  Kibana:     http://localhost:5601"
	@if command -v open >/dev/null; then \
		open "http://localhost:3001"; \
	elif command -v xdg-open >/dev/null; then \
		xdg-open "http://localhost:3001"; \
	fi

ssl-renew:
	@echo "$(GREEN)🔐 Renewing SSL certificates...$(RESET)"
	$(PROD_CMD) exec certbot certbot renew --quiet
	$(PROD_CMD) exec nginx nginx -s reload
	@echo "$(GREEN)✅ SSL certificates renewed$(RESET)"

# =============================================================================
# SETUP & DEPLOYMENT HELPERS
# =============================================================================

setup-dev:
	@echo "$(GREEN)⚙️  Setting up development environment...$(RESET)"
	@if [ ! -f .env.development ]; then \
		echo "$(YELLOW)Creating .env.development from template...$(RESET)"; \
		cp .env.development.example .env.development 2>/dev/null || \
		echo "$(RED)❌ .env.development.example not found. Please create .env.development manually.$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Development setup complete!$(RESET)"
	@echo "$(BLUE)💡 Edit .env.development with your settings, then run 'make dev'$(RESET)"

setup-prod:
	@echo "$(GREEN)⚙️  Setting up production environment...$(RESET)"
	@if [ ! -f .env.production ]; then \
		echo "$(YELLOW)Creating .env.production from template...$(RESET)"; \
		cp .env.production.example .env.production 2>/dev/null || \
		echo "$(RED)❌ .env.production.example not found. Please create .env.production manually.$(RESET)"; \
	fi
	@echo "$(GREEN)✅ Production setup complete!$(RESET)"
	@echo "$(BLUE)💡 Edit .env.production with your settings, then run 'make prod'$(RESET)"

# Generate production secrets
generate-secrets:
	@echo "$(GREEN)🔐 Generating production secrets...$(RESET)"
	@mkdir -p secrets
	@openssl rand -base64 32 > secrets/postgres_password.txt
	@openssl rand -base64 32 > secrets/redis_password.txt
	@openssl rand -base64 64 > secrets/jwt_secret.txt
	@openssl rand -base64 32 > secrets/grafana_password.txt
	@chmod 600 secrets/*
	@echo "$(GREEN)✅ Secrets generated in ./secrets/$(RESET)"
	@echo "$(YELLOW)⚠️  Remember to update .env.production to use these secrets!$(RESET)"

# Quick status check
status:
	@echo "$(GREEN)📊 Environment Status:$(RESET)"
	@echo ""
	@echo "$(BLUE)Environment Files:$(RESET)"
	@ls -la .env.* 2>/dev/null || echo "❌ No .env files found"
	@echo ""
	@echo "$(BLUE)Development Environment:$(RESET)"
	@if [ -f .env.development ]; then \
		if $(DEV_CMD) ps -q 2>/dev/null | grep -q .; then \
			echo "$(GREEN)✅ Running$(RESET)"; \
			$(DEV_CMD) ps --format "  {{.Name}}: {{.Status}}" 2>/dev/null; \
		else \
			echo "$(RED)❌ Not running$(RESET)"; \
		fi \
	else \
		echo "$(RED)❌ .env.development file not found$(RESET)"; \
	fi
	@echo ""
	@echo "$(BLUE)Production Environment:$(RESET)"
	@if [ -f .env.production ]; then \
		if $(PROD_CMD) ps -q 2>/dev/null | grep -q .; then \
			echo "$(GREEN)✅ Running$(RESET)"; \
			$(PROD_CMD) ps --format "  {{.Name}}: {{.Status}}" 2>/dev/null; \
		else \
			echo "$(RED)❌ Not running$(RESET)"; \
		fi \
	else \
		echo "$(RED)❌ .env.production file not found$(RESET)"; \
	fi

# Debug environment configuration
debug-env:
	@echo "$(GREEN)🔍 Environment Debug Information:$(RESET)"
	@echo ""
	@echo "$(BLUE)Current Directory:$(RESET)"
	@pwd
	@echo ""
	@echo "$(BLUE)Environment Files:$(RESET)"
	@ls -la .env.* 2>/dev/null || echo "❌ No .env files found"
	@echo ""
	@if [ -f .env.development ]; then \
		echo "$(BLUE).env.development (first 10 lines):$(RESET)"; \
		head -10 .env.development; \
		echo ""; \
		echo "$(BLUE)Testing .env.development with Docker Compose:$(RESET)"; \
		docker compose $(DEV_FILES) $(DEV_ENV) config --services 2>/dev/null || echo "❌ Failed to load development configuration"; \
	else \
		echo "$(RED)❌ .env.development not found$(RESET)"; \
	fi
	@echo ""
	@if [ -f .env.production ]; then \
		echo "$(BLUE).env.production (first 10 lines):$(RESET)"; \
		head -10 .env.production; \
		echo ""; \
		echo "$(BLUE)Testing .env.production with Docker Compose:$(RESET)"; \
		docker compose $(PROD_FILES) $(PROD_ENV) config --services 2>/dev/null || echo "❌ Failed to load production configuration"; \
	else \
		echo "$(RED)❌ .env.production not found$(RESET)"; \
	fi

# Development tools shortcuts
dev-tools:
	@echo "$(GREEN)🛠️  Development tools:$(RESET)"
	@echo "  pgAdmin:        http://localhost:5050"
	@echo "  Redis Commander: http://localhost:8081"
	@echo "  Swagger UI:     http://localhost:8082"
	@echo "  MailHog:        http://localhost:8025"
	@echo "  MinIO:          http://localhost:9001"

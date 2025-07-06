

# Makefile
.PHONY: dev prod build up down restart logs shell clean test


# Development commands
dev:
	docker compose -f docker-compose.dev.yml up -d --build

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

dev-rebuild:
	docker compose -f docker-compose.dev.yml up -d --build --force-recreate

dev-down:
	docker compose -f docker-compose.dev.yml down


# Production commands
prod:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down


# General commands
build:
	docker compose build --no-cache

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

shell:
	docker compose exec backend /bin/sh

clean:
	docker compose down -v
	docker system prune -f
	docker volume prune -f

test:
	docker compose exec backend go test ./...


# Database commands (Adjust the database name <myapp> as needed)
db-shell:
	docker compose exec postgres psql -U postgres -d myapp  

db-migrate:
	docker compose exec backend go run main.go migrate
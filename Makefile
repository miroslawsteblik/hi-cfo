

# Makefile
.PHONY: dev prod build up down restart logs shell clean test


# Development commands
dev:
	docker compose -f docker-compose.dev.yml up -d --build

logs:
	docker compose -f docker-compose.dev.yml logs -f

rebuild:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.dev.yml up -d --build --force-recreate

down:
	docker compose -f docker-compose.dev.yml down

clean:
	docker compose -f docker-compose.dev.yml down -v
	docker system prune -f
	docker volume prune -f

db-shell:
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d myapp  

# Production commands
prod:
	docker compose -f docker-compose.prod.yml up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml down


# General commands
build:
	docker compose build --no-cache

up-prod:
	docker compose up -d

down-prod:
	docker compose down

restart:
	docker compose restart

logs-prod:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

shell:
	docker compose exec backend /bin/sh


test:
	docker compose exec backend go test ./...


# Database commands (Adjust the database name <myapp> as needed)


db-migrate:
	docker compose exec backend go run main.go migrate
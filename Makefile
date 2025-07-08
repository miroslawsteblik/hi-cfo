# Makefile
.PHONY: dev prod build up down restart logs shell clean test

dev:
	docker compose -f docker-compose.dev.yml up -d

prod:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.prod.yml down

logs-dev:
	docker compose -f docker-compose.dev.yml logs -f

config-dev:
	docker compose -f docker-compose.dev.yml config

logs-prod:
	docker compose -f docker-compose.prod.yml logs -f

rebuild:
	docker compose -f docker-compose.dev.yml down
	docker compose -f docker-compose.dev.yml up -d --build --force-recreate

clean:
	docker compose -f docker-compose.dev.yml down -v
	docker system prune -f
	docker volume prune -f

db-shell:
	docker compose -f docker-compose.dev.yml exec postgres psql -U postgres -d myapp
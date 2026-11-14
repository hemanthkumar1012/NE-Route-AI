.PHONY: up down logs reset build test test-backend test-ml test-frontend-core test-frontend test-full
up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=150

build:
	docker compose build

reset:
	docker compose down -v
	docker compose up --build

test: test-backend test-ml test-frontend-core
test-full: test-backend test-ml test-frontend-core test-frontend
test-backend:
	pytest backend/tests -q
test-ml:
	cd ml-service && pytest tests -q
test-frontend-core:
	cd frontend && npm run test:core
test-frontend:
	cd frontend && npm test && npm run build

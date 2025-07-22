# Cloud-Shop Microservices Express.js Makefile
# Comprehensive management tool for microservices development and deployment

.PHONY: help install build up down logs test test-unit test-integration clean dev migrate-all seed-all lint format status health

# Default target
help: ## Show this help message
	@echo "Cloud-Shop Microservices Management Commands:"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Environment variables
SERVICES := auth users cards loans gateway message
COMPOSE_FILE := docker-compose.yml

# Installation and Setup
install: ## Install dependencies for all services
	@echo "Installing dependencies for all services..."
	@for service in $(SERVICES); do \
		echo "Installing dependencies for $$service service..."; \
		cd services/$$service && npm install && cd ../..; \
	done
	@echo "Installing shared dependencies..."
	@cd shared && npm install && cd ..

install-service: ## Install dependencies for specific service (usage: make install-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make install-service SERVICE=<service-name>"; exit 1; fi
	@echo "Installing dependencies for $(SERVICE) service..."
	@cd services/$(SERVICE) && npm install

# Database Management
migrate-all: ## Run database migrations for all services
	@echo "Running database migrations for all services..."
	@for service in auth users cards loans; do \
		echo "Migrating $$service database..."; \
		cd services/$$service && npx prisma migrate dev --skip-generate && npx prisma generate && cd ../..; \
	done

migrate-service: ## Run migration for specific service (usage: make migrate-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make migrate-service SERVICE=<service-name>"; exit 1; fi
	@echo "Running migration for $(SERVICE) service..."
	@cd services/$(SERVICE) && npx prisma migrate dev --skip-generate && npx prisma generate

seed-all: ## Seed databases for all services
	@echo "Seeding databases for all services..."
	@for service in auth users cards loans; do \
		if [ -f "services/$$service/prisma/seed.js" ]; then \
			echo "Seeding $$service database..."; \
			cd services/$$service && npm run db:seed && cd ../..; \
		fi; \
	done

# Docker Management
build: ## Build all Docker containers
	@echo "Building all services..."
	@docker-compose -f $(COMPOSE_FILE) build

build-service: ## Build specific service (usage: make build-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make build-service SERVICE=<service-name>"; exit 1; fi
	@echo "Building $(SERVICE) service..."
	@docker-compose -f $(COMPOSE_FILE) build $(SERVICE)-service

up: ## Start all services with Docker Compose
	@echo "Starting all services..."
	@docker-compose -f $(COMPOSE_FILE) up -d

up-logs: ## Start all services and follow logs
	@echo "Starting all services with logs..."
	@docker-compose -f $(COMPOSE_FILE) up

up-service: ## Start specific service (usage: make up-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make up-service SERVICE=<service-name>"; exit 1; fi
	@echo "Starting $(SERVICE) service..."
	@docker-compose -f $(COMPOSE_FILE) up -d $(SERVICE)-service

down: ## Stop all services
	@echo "Stopping all services..."
	@docker-compose -f $(COMPOSE_FILE) down

down-volumes: ## Stop all services and remove volumes
	@echo "Stopping all services and removing volumes..."
	@docker-compose -f $(COMPOSE_FILE) down -v

restart: ## Restart all services
	@echo "Restarting all services..."
	@$(MAKE) down
	@$(MAKE) up

restart-service: ## Restart specific service (usage: make restart-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make restart-service SERVICE=<service-name>"; exit 1; fi
	@echo "Restarting $(SERVICE) service..."
	@docker-compose -f $(COMPOSE_FILE) restart $(SERVICE)-service

# Development
dev-infra: ## Start infrastructure services only (fast startup)
	@echo "Starting infrastructure services..."
	@docker-compose -f $(COMPOSE_FILE) up -d postgres zookeeper kafka
	@echo "Waiting for services to be ready..."
	@sleep 10
	@echo "Infrastructure is ready!"
	@echo "Use 'make dev-core' for core services or 'make dev-service SERVICE=<name>' for individual services"

dev-core: ## Start core services (auth, users, gateway)
	@echo "Starting core services..."
	@$(MAKE) dev-infra
	@docker-compose -f $(COMPOSE_FILE) up -d keycloak auth-service users-service gateway-service
	@echo "Core services started!"

dev-minimal: ## Start minimal development environment (lightweight profile)
	@echo "Starting minimal development environment..."
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "Minimal services started! (postgres, kafka, auth, users, gateway)"
	@echo "Check status with: docker-compose -f docker-compose.dev.yml ps"

dev: ## Start development environment (legacy - use dev-infra for faster startup)
	@echo "Starting development environment..."
	@docker-compose -f $(COMPOSE_FILE) up -d zookeeper kafka
	@echo "Waiting for Kafka to be ready..."
	@sleep 10
	@echo "Development infrastructure is ready!"
	@echo "Use 'make dev-service SERVICE=<service-name>' to start individual services"

dev-service: ## Start specific service in development mode (usage: make dev-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make dev-service SERVICE=<service-name>"; exit 1; fi
	@echo "Starting $(SERVICE) service in development mode..."
	@cd services/$(SERVICE) && npm run dev

dev-all: ## Start all services in development mode locally
	@echo "Starting all services in development mode..."
	@$(MAKE) dev
	@for service in $(SERVICES); do \
		echo "Starting $$service in development mode..."; \
		cd services/$$service && npm run dev & cd ../..; \
	done
	@echo "All services started in development mode"

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	@for service in auth users cards loans; do \
		echo "Testing $$service service..."; \
		cd services/$$service && npm test && cd ../..; \
	done

test-service: ## Run tests for specific service (usage: make test-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make test-service SERVICE=<service-name>"; exit 1; fi
	@echo "Running tests for $(SERVICE) service..."
	@cd services/$(SERVICE) && npm test

test-watch: ## Run tests in watch mode for specific service (usage: make test-watch SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make test-watch SERVICE=<service-name>"; exit 1; fi
	@echo "Running tests in watch mode for $(SERVICE) service..."
	@cd services/$(SERVICE) && npm test -- --watch

test-coverage: ## Run tests with coverage for specific service (usage: make test-coverage SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make test-coverage SERVICE=<service-name>"; exit 1; fi
	@echo "Running tests with coverage for $(SERVICE) service..."
	@cd services/$(SERVICE) && npm test -- --coverage

# Monitoring and Logs
logs: ## Show logs for all services
	@docker-compose -f $(COMPOSE_FILE) logs -f

logs-service: ## Show logs for specific service (usage: make logs-service SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make logs-service SERVICE=<service-name>"; exit 1; fi
	@docker-compose -f $(COMPOSE_FILE) logs -f $(SERVICE)-service

status: ## Show status of all containers
	@echo "Service Status:"
	@docker-compose -f $(COMPOSE_FILE) ps

health: ## Check health of all services
	@echo "Checking service health..."
	@echo "Gateway Service (8072):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8072/actuator/health || echo "Service not responding"
	@echo "Auth Service (8081):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8081/actuator/health || echo "Service not responding"
	@echo "Users Service (8082):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8082/actuator/health || echo "Service not responding"
	@echo "Cards Service (9000):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:9000/actuator/health || echo "Service not responding"
	@echo "Loans Service (8090):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8090/actuator/health || echo "Service not responding"
	@echo "Message Service (9010):"
	@curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:9010/actuator/health || echo "Service not responding"

# Utility Commands
clean: ## Clean up containers, images, and volumes
	@echo "Cleaning up Docker resources..."
	@docker-compose -f $(COMPOSE_FILE) down -v --rmi all --remove-orphans
	@docker system prune -f

clean-node-modules: ## Remove all node_modules directories
	@echo "Removing all node_modules directories..."
	@find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "All node_modules directories removed"

format: ## Format code for all services
	@echo "Formatting code for all services..."
	@for service in $(SERVICES); do \
		if [ -f "services/$$service/package.json" ] && grep -q "prettier" services/$$service/package.json; then \
			echo "Formatting $$service service..."; \
			cd services/$$service && npm run format && cd ../..; \
		fi; \
	done

lint: ## Lint code for all services
	@echo "Linting code for all services..."
	@for service in $(SERVICES); do \
		if [ -f "services/$$service/package.json" ] && grep -q "eslint\|lint" services/$$service/package.json; then \
			echo "Linting $$service service..."; \
			cd services/$$service && npm run lint && cd ../..; \
		fi; \
	done

# Database Utilities
db-reset: ## Reset all databases (WARNING: This will delete all data)
	@echo "⚠️  WARNING: This will delete all database data!"
	@read -p "Are you sure you want to continue? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "Resetting all databases..."; \
		for service in auth users cards loans; do \
			echo "Resetting $$service database..."; \
			cd services/$$service && rm -f prisma/data/app.db && npx prisma migrate reset --force && cd ../..; \
		done; \
		echo "All databases reset successfully"; \
	else \
		echo "Database reset cancelled"; \
	fi

db-studio: ## Open Prisma Studio for specific service (usage: make db-studio SERVICE=accounts)
	@if [ -z "$(SERVICE)" ]; then echo "Usage: make db-studio SERVICE=<service-name>"; exit 1; fi
	@echo "Opening Prisma Studio for $(SERVICE) service..."
	@cd services/$(SERVICE) && npx prisma studio

# Quick Start Commands
quick-start: ## Quick start for development (install deps, migrate, start infrastructure)
	@echo "Quick start for development..."
	@$(MAKE) install
	@$(MAKE) migrate-all
	@$(MAKE) dev
	@echo "✅ Development environment ready!"
	@echo "Run 'make dev-service SERVICE=<service-name>' to start individual services"

quick-prod: ## Quick production start (build and run all services)
	@echo "Quick production start..."
	@$(MAKE) build
	@$(MAKE) up
	@echo "✅ Production environment started!"
	@echo "Run 'make status' to check service status"

# Information Commands
info: ## Show project information
	@echo "📋 Cloud-Shop Microservices Express.js Project"
	@echo "=============================================="
	@echo "Services:"
	@echo "  • Gateway Service (8072) - API Gateway & Authentication"
	@echo "  • Auth Service (8081) - Authentication & Authorization"
	@echo "  • Users Service (8082) - User Profile & Account Management"
	@echo "  • Cards Service (9000) - Card Management"
	@echo "  • Loans Service (8090) - Loan Management"
	@echo "  • Message Service (9010) - Event Processing"
	@echo ""
	@echo "Infrastructure:"
	@echo "  • Apache Kafka (9092) - Message Broker"
	@echo "  • Zookeeper (2181) - Kafka Coordination"
	@echo "  • PostgreSQL - Database (per service)"
	@echo ""
	@echo "Useful Commands:"
	@echo "  make quick-start  - Set up development environment"
	@echo "  make dev-service  - Start service in development mode"
	@echo "  make test        - Run all tests"
	@echo "  make health      - Check service health"

# Port Information
ports: ## Show service port mapping
	@echo "🌐 Service Port Mapping"
	@echo "======================"
	@echo "Gateway Service:    http://localhost:8072"
	@echo "Auth Service:       http://localhost:8081"
	@echo "Users Service:      http://localhost:8082"
	@echo "Cards Service:      http://localhost:9000"
	@echo "Loans Service:      http://localhost:8090"
	@echo "Message Service:    http://localhost:9010"
	@echo "Kafka:              localhost:9092"
	@echo "Zookeeper:          localhost:2181"

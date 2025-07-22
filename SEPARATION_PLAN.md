# Service Separation Plan: Accounts → Auth + Users

## Current State
- **Accounts Service**: Customer management + Bank account management
- **Gateway Service**: Authentication + API routing

## Target State
- **Auth Service**: Authentication functionality (extracted from Gateway)
- **Users Service**: User/customer management (extracted from Accounts)
- **Gateway Service**: Only API routing (authentication removed)
- **Remove**: Accounts service completely

## Functionality Mapping

### Auth Service (New)
**Source**: Gateway service authentication functionality
- JWT token verification with Keycloak
- Token refresh and revocation
- Authentication middleware
- Token caching
- Keycloak integration

**Files to move from Gateway**:
- `src/middleware/authMiddleware.js`
- `src/services/tokenRefreshService.js`
- Auth-related routes from `src/app.js`

### Users Service (New)
**Source**: Accounts service customer functionality
- Customer CRUD operations
- User profile management
- Customer details aggregation (with Cards/Loans)

**Files to move from Accounts**:
- `src/services/customersService.js` (customer management)
- Customer-related parts of `src/services/accountsService.js`
- Customer-related controllers
- Customer database schema

### Gateway Service (Updated)
**Remaining functionality**:
- API routing and proxying
- Rate limiting
- CORS handling
- Health checks

**Remove**:
- Authentication middleware
- Token refresh endpoints
- Keycloak integration

## Database Schema Changes

### Auth Service Database
```sql
-- Sessions/tokens table for token management
CREATE TABLE auth_sessions (
  session_id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  refresh_token VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Users Service Database
```sql
-- Move from accounts database
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  mobile_number VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_accounts (
  account_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  account_number BIGINT UNIQUE NOT NULL,
  account_type VARCHAR NOT NULL,
  branch_address VARCHAR NOT NULL,
  communication_sw BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Changes

### Auth Service APIs
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh
- `POST /auth/revoke` - Token revocation
- `POST /auth/verify` - Token verification
- `GET /auth/health` - Health check

### Users Service APIs
- `POST /users` - Create user
- `GET /users/{id}` - Get user by ID
- `GET /users/mobile/{mobile}` - Get user by mobile
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `GET /users/{id}/details` - Get user with accounts/cards/loans

### Gateway Service Updates
- Remove `/auth/*` routes (proxy to Auth service instead)
- Update `/kurobank/accounts/*` to proxy to Users service
- Add proxy routes for Auth service

## Inter-Service Communication

### Users Service → Cards/Loans Services
- Keep existing REST client pattern
- Update service discovery if needed

### Gateway → Auth Service
- Proxy authentication requests
- Remove local authentication logic

### All Services → Auth Service
- Services can call Auth service for token verification
- Or use shared authentication middleware

## Implementation Steps

1. **Create Auth Service**
   - Set up new service structure
   - Move authentication logic from Gateway
   - Create Auth database schema
   - Implement Auth APIs
   - Add to docker-compose.yml

2. **Create Users Service**
   - Set up new service structure
   - Move customer logic from Accounts
   - Create Users database schema
   - Implement Users APIs
   - Update Cards/Loans integration
   - Add to docker-compose.yml

3. **Update Gateway Service**
   - Remove authentication logic
   - Add proxy routes for Auth and Users services
   - Update routing configuration

4. **Update Other Services**
   - Update service URLs in environment variables
   - Update API Gateway routing
   - Update Makefile and scripts

5. **Remove Accounts Service**
   - Remove from docker-compose.yml
   - Remove service directory
   - Update documentation

6. **Testing**
   - Test Auth service authentication flows
   - Test Users service CRUD operations
   - Test inter-service communication
   - Test end-to-end user flows

## Port Assignments
- **Auth Service**: 8081
- **Users Service**: 8082
- **Gateway Service**: 8072 (unchanged)
- **Cards Service**: 9000 (unchanged)
- **Loans Service**: 8090 (unchanged)
- **Message Service**: 9010 (unchanged)

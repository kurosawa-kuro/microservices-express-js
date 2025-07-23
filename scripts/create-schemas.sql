CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS products;
CREATE SCHEMA IF NOT EXISTS cart;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS keycloak;

GRANT ALL PRIVILEGES ON SCHEMA auth TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA users TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA products TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA cart TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA orders TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA payments TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA analytics TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA content TO "cloud-shop";
GRANT ALL PRIVILEGES ON SCHEMA keycloak TO "cloud-shop";

GRANT USAGE ON SCHEMA auth TO "cloud-shop";
GRANT USAGE ON SCHEMA users TO "cloud-shop";
GRANT USAGE ON SCHEMA products TO "cloud-shop";
GRANT USAGE ON SCHEMA cart TO "cloud-shop";
GRANT USAGE ON SCHEMA orders TO "cloud-shop";
GRANT USAGE ON SCHEMA payments TO "cloud-shop";
GRANT USAGE ON SCHEMA analytics TO "cloud-shop";
GRANT USAGE ON SCHEMA content TO "cloud-shop";
GRANT USAGE ON SCHEMA keycloak TO "cloud-shop";

GRANT CREATE ON SCHEMA auth TO "cloud-shop";
GRANT CREATE ON SCHEMA users TO "cloud-shop";
GRANT CREATE ON SCHEMA products TO "cloud-shop";
GRANT CREATE ON SCHEMA cart TO "cloud-shop";
GRANT CREATE ON SCHEMA orders TO "cloud-shop";
GRANT CREATE ON SCHEMA payments TO "cloud-shop";
GRANT CREATE ON SCHEMA analytics TO "cloud-shop";
GRANT CREATE ON SCHEMA content TO "cloud-shop";
GRANT CREATE ON SCHEMA keycloak TO "cloud-shop";

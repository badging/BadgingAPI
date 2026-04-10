/**
 * Environment configuration interface
 */
export interface IEnvironmentConfig {
  // Server
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database
  DB_HOST: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD?: string;
  DB_DIALECT: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  TEST_DB_NAME?: string;
  // GitHub OAuth (Project Badging)
  GITHUB_AUTH_CLIENT_ID: string;
  GITHUB_AUTH_CLIENT_SECRET: string;

  // GitHub OAuth (Event Badging)
  GITHUB_AUTH_CLIENT_ID_EVENT: string;
  GITHUB_AUTH_CLIENT_SECRET_EVENT: string;

  // GitHub App
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_CLIENT_ID: string;
  GITHUB_APP_CLIENT_SECRET: string;
  GITHUB_APP_WEBHOOK_SECRET: string;

  // GitLab OAuth
  GITLAB_APP_CLIENT_ID: string;
  GITLAB_APP_CLIENT_SECRET: string;
  GITLAB_APP_REDIRECT_URI: string;

  //repository for event badging
  REPOSITORY_NAME: string;

  // Email
  EMAIL_HOST: string;
  EMAIL_ADDRESS: string;
  EMAIL_PASSWORD: string;

  // Encryption
  ENCRYPTION_SECRET_KEY: string;

  // Augur API
  AUGUR_API_KEY: string;
  AUGUR_APP_CLIENT_SECRET: string;

  // Development
  SMEE_CLIENT_URL?: string;
  RETURN_JSON_ON_LOGIN?: boolean;
}

/**
 * Get environment variable with type safety
 */
export function getEnvVar(key: keyof IEnvironmentConfig, required?: true): string;
export function getEnvVar(key: keyof IEnvironmentConfig, required: false): string;
export function getEnvVar(key: string, defaultValue: string): string;
export function getEnvVar(key: string, requiredOrDefault?: boolean | string): string {
  const value = process.env[key];
  if (typeof requiredOrDefault === 'string') {
    return value || requiredOrDefault;
  }
  if (requiredOrDefault !== false && !value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value || '';
}

/**
 * Get environment variable as number
 */
export function getEnvVarAsNumber(key: keyof IEnvironmentConfig, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

/**
 * Get environment variable as boolean
 */
export function getEnvVarAsBoolean(key: keyof IEnvironmentConfig, defaultValue = false): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

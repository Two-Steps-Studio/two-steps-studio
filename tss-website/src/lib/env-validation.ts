/**
 * Environment variable validation utility
 * Ensures all required environment variables are present and valid at runtime
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  defaultValue?: string;
}

const envConfigs: EnvVarConfig[] = [
  // Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true },
  
  // Auth
  { name: 'AUTH_SECRET', required: false, defaultValue: 'default-secret-change-in-production' },
  
  // Discord (optional for OAuth integration)
  { name: 'DISCORD_CLIENT_ID', required: false },
  { name: 'DISCORD_CLIENT_SECRET', required: false },
  
  // Stripe (optional for payments)
  { name: 'STRIPE_SECRET_KEY', required: false },
  { name: 'STRIPE_WEBHOOK_SECRET', required: false },
  { name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', required: false },
  // Public base URL for Stripe success/cancel redirects (falls back to the request origin)
  { name: 'NEXT_PUBLIC_APP_URL', required: false },
];

const validationErrors: string[] = [];

function validateEnvVar(config: EnvVarConfig): string | null {
  const value = process.env[config.name];
  
  if (!value && config.required) {
    return `Missing required environment variable: ${config.name}`;
  }
  
  if (!value && !config.required) {
    if (config.defaultValue) {
      process.env[config.name] = config.defaultValue;
    }
    return null;
  }
  
  if (value && config.validator && !config.validator(value)) {
    return `Invalid value for environment variable: ${config.name}`;
  }
  
  return null;
}

export function validateEnv(): { isValid: boolean; errors: string[] } {
  validationErrors.length = 0;
  
  for (const config of envConfigs) {
    const error = validateEnvVar(config);
    if (error) {
      validationErrors.push(error);
    }
  }
  
  const isValid = validationErrors.length === 0;
  
  if (!isValid && process.env.NODE_ENV === 'development') {
    console.warn('[Environment Validation]', validationErrors);
  }
  
  return { isValid, errors: validationErrors };
}

export function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

// Validate on import in development
if (process.env.NODE_ENV === 'development') {
  validateEnv();
}

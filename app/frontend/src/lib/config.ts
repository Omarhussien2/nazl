type RuntimeConfig = {
  API_BASE_URL: string;
};

// Runtime configuration
let runtimeConfig: RuntimeConfig | null = null;

// Configuration loading state
let configLoading = true;

const isBrowser = typeof window !== 'undefined';
const isLocalHost =
  isBrowser &&
  ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);

const localConfig: RuntimeConfig = {
  API_BASE_URL: 'http://127.0.0.1:8000',
};

const sameOriginConfig: RuntimeConfig = {
  API_BASE_URL: isBrowser ? window.location.origin : '',
};

const fallbackConfig = isLocalHost ? localConfig : sameOriginConfig;

function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'API_BASE_URL' in value &&
    typeof value.API_BASE_URL === 'string' &&
    value.API_BASE_URL.trim().length > 0
  );
}

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  try {
    console.log('🔧 DEBUG: Starting to load runtime config...');
    // Try to load configuration from a config endpoint
    const response = await fetch('/api/config');
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Only parse as JSON if the response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        const config = await response.json();
        if (!isRuntimeConfig(config)) {
          console.log('Runtime config shape is invalid, skipping');
          return;
        }
        runtimeConfig = config;
        console.log('Runtime config loaded successfully');
      } else {
        console.log(
          'Config endpoint returned non-JSON response, skipping runtime config'
        );
      }
    } else {
      console.log(
        '🔧 DEBUG: Config fetch failed with status:',
        response.status
      );
    }
  } catch (error) {
    console.log('Failed to load runtime config, using defaults:', error);
  } finally {
    configLoading = false;
    console.log(
      '🔧 DEBUG: Config loading finished, configLoading set to false'
    );
  }
}

// Get current configuration
export function getConfig() {
  // If config is still loading, return default config to avoid using stale Vite env vars
  if (configLoading) {
    console.log('Config still loading, using default config');
    return fallbackConfig;
  }

  // First try runtime config (for Lambda)
  if (runtimeConfig) {
    console.log('Using runtime config');
    return runtimeConfig;
  }

  // Then try Vite environment variables (for local development)
  if (import.meta.env.VITE_API_BASE_URL) {
    const viteConfig = {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
    console.log('Using Vite environment config');
    return viteConfig;
  }

  // Finally fall back to same-origin in production or localhost in dev.
  console.log('Using default config');
  return fallbackConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};

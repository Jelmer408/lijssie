interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
}

export const config: AppConfig = {
  apiUrl: process.env.VITE_API_URL ?? 'http://localhost:5174/',
  environment: (process.env.VITE_ENVIRONMENT ?? 'development') as AppConfig['environment'],
}; 
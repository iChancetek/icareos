import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/mediscribe-.*\.svc\..*\.pinecone\.io/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/api\/ai\/.*/,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /\/api\/.*/,
        handler: 'NetworkOnly',
      }
    ],
  }
});

let firebaseEnv = {};
if (process.env.FIREBASE_WEBAPP_CONFIG) {
  try {
    const config = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    firebaseEnv = {
      NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
      NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: config.measurementId || "",
    };
  } catch (e) {
    console.error("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    ...firebaseEnv,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopack: {},
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);

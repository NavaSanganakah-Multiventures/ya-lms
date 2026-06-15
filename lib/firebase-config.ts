import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

export type FirebaseConfig = {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

export async function fetchFirebaseConfig(): Promise<FirebaseConfig | null> {
  try {
    const res = await fetch('/api/firebase/config');
    if (!res.ok) return null;
    const config: FirebaseConfig = await res.json();
    if (!config.apiKey || !config.projectId) return null;
    return config;
  } catch {
    return null;
  }
}

export function getOrInitApp(config: FirebaseConfig): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(config);
  }
  return getApps()[0];
}

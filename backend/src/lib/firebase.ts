import admin from 'firebase-admin';
import { env } from './env';
import { logger } from './logger';

function initFirebase(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0] as admin.app.App;
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_KEY) as admin.ServiceAccount;
  } catch {
    logger.error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON — check your .env');
    process.exit(1);
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

export const firebaseAdmin = initFirebase();

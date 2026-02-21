import admin from "firebase-admin";

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check for service account JSON
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    // Parse JSON from environment variable
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else if (serviceAccountPath) {
    // Use service account file path
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // For local development with emulators
    console.warn("No Firebase credentials found. Using default initialization.");
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "demo-project",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  return firebaseApp;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin.firestore();
}

export function getAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin.auth();
}

export function getStorage(): admin.storage.Storage {
  if (!firebaseApp) {
    throw new Error("Firebase not initialized. Call initializeFirebase() first.");
  }
  return admin.storage();
}

// Firestore helpers
export const db = {
  // Users
  users: () => getFirestore().collection("users"),
  user: (userId: string) => getFirestore().collection("users").doc(userId),

  // Organizations
  organizations: () => getFirestore().collection("organizations"),
  organization: (orgId: string) => getFirestore().collection("organizations").doc(orgId),

  // Social Accounts (subcollection of organizations)
  socialAccounts: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("socialAccounts"),
  socialAccount: (orgId: string, accountId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("socialAccounts")
      .doc(accountId),

  // Posts (subcollection of organizations)
  posts: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("posts"),
  post: (orgId: string, postId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("posts").doc(postId),

  // Scheduled Jobs
  scheduledJobs: () => getFirestore().collection("scheduledJobs"),
  scheduledJob: (jobId: string) => getFirestore().collection("scheduledJobs").doc(jobId),

  // Analytics - Daily (subcollection of organizations)
  analyticsDaily: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("analyticsDaily"),
  analyticsDailyDoc: (orgId: string, date: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("analyticsDaily").doc(date),

  // Analytics - Monthly (subcollection of organizations)
  analyticsMonthly: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("analyticsMonthly"),
  analyticsMonthlyDoc: (orgId: string, month: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("analyticsMonthly").doc(month),

  // Account Analytics (sub-subcollection of socialAccounts)
  accountAnalytics: (orgId: string, accountId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("socialAccounts")
      .doc(accountId)
      .collection("accountAnalytics"),
  accountAnalyticsDoc: (orgId: string, accountId: string, date: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("socialAccounts")
      .doc(accountId)
      .collection("accountAnalytics")
      .doc(date),

  // Post Analytics (subcollection of posts)
  postAnalytics: (orgId: string, postId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("posts")
      .doc(postId)
      .collection("postAnalytics"),
  postAnalyticsDoc: (orgId: string, postId: string, snapshotId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("posts")
      .doc(postId)
      .collection("postAnalytics")
      .doc(snapshotId),

  // AI Suggestions (subcollection of organizations)
  aiSuggestions: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("aiSuggestions"),
  aiSuggestion: (orgId: string, suggestionId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("aiSuggestions")
      .doc(suggestionId),

  // Video Jobs (subcollection of organizations)
  videoJobs: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("videoJobs"),
  videoJob: (orgId: string, jobId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("videoJobs")
      .doc(jobId),

  // Invitations (subcollection of organizations)
  invitations: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("invitations"),
  invitation: (orgId: string, invitationId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("invitations")
      .doc(invitationId),

  // Activity Log (subcollection of organizations)
  activityLog: (orgId: string) =>
    getFirestore().collection("organizations").doc(orgId).collection("activityLog"),
  activityLogEntry: (orgId: string, logId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("activityLog")
      .doc(logId),

  // Comments (subcollection of posts)
  comments: (orgId: string, postId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("posts")
      .doc(postId)
      .collection("comments"),
  comment: (orgId: string, postId: string, commentId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId),

  // Usage (subcollection of users)
  usage: (userId: string) =>
    getFirestore().collection("users").doc(userId).collection("usage"),
  usagePeriod: (userId: string, periodId: string) =>
    getFirestore().collection("users").doc(userId).collection("usage").doc(periodId),

  // Brand Voice (single doc under org settings)
  brandVoice: (orgId: string) =>
    getFirestore()
      .collection("organizations")
      .doc(orgId)
      .collection("settings")
      .doc("brandVoice"),

  // Collection group queries
  socialAccountsGroup: () => getFirestore().collectionGroup("socialAccounts"),
};

import { db } from "./firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { ActivityLogEntry } from "../types/index.js";

export async function logActivity(
  orgId: string,
  userId: string,
  action: string,
  resourceType: ActivityLogEntry["resourceType"],
  resourceId?: string,
  details?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Fetch user display name
  let userDisplayName = "Unknown User";
  try {
    const userDoc = await db.user(userId).get();
    if (userDoc.exists) {
      userDisplayName = userDoc.data()?.displayName || userDoc.data()?.email || "Unknown User";
    }
  } catch {
    // Non-fatal, proceed with default name
  }

  const entry: Omit<ActivityLogEntry, "id"> = {
    userId,
    userDisplayName,
    action,
    resourceType,
    resourceId,
    details,
    metadata,
    createdAt: Timestamp.now(),
  };

  await db.activityLog(orgId).add(entry);
}

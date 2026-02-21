import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { VideoJob } from "../types/index.js";

export async function initiateVideoGeneration(
  orgId: string,
  userId: string,
  prompt: string,
  aspectRatio?: string
): Promise<string> {
  const jobRef = db.videoJobs(orgId).doc();
  const jobId = jobRef.id;

  const job: Omit<VideoJob, "id"> = {
    orgId,
    userId,
    status: "pending",
    prompt,
    aspectRatio: aspectRatio || "16:9",
    resultUrl: null,
    errorMessage: null,
    externalJobId: null,
    createdAt: Timestamp.now(),
    completedAt: null,
  };

  await jobRef.set({ id: jobId, ...job });

  // Stub: In production, this would call Runway ML or similar API
  // For now, simulate an external API call by setting status to "processing"
  // and storing a fake external job ID
  const externalJobId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await jobRef.update({
    status: "processing",
    externalJobId,
  });

  return jobId;
}

export async function checkVideoJobStatus(
  orgId: string,
  jobId: string
): Promise<VideoJob | null> {
  const jobDoc = await db.videoJob(orgId, jobId).get();

  if (!jobDoc.exists) {
    return null;
  }

  const job = jobDoc.data() as VideoJob;

  // Stub: In production, this would check the external API status
  // For now, if the job has been processing for more than 60 seconds, mark it as completed
  if (job.status === "processing" && job.createdAt) {
    const createdMs = job.createdAt.toDate().getTime();
    const elapsedMs = Date.now() - createdMs;

    if (elapsedMs > 60_000) {
      await db.videoJob(orgId, jobId).update({
        status: "completed",
        resultUrl: `https://storage.example.com/videos/${jobId}.mp4`,
        completedAt: Timestamp.now(),
      });

      return {
        ...job,
        status: "completed",
        resultUrl: `https://storage.example.com/videos/${jobId}.mp4`,
        completedAt: Timestamp.now(),
      };
    }
  }

  return job;
}

export async function listVideoJobs(
  orgId: string,
  limit: number = 20
): Promise<VideoJob[]> {
  const snapshot = await db
    .videoJobs(orgId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as VideoJob);
}

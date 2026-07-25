export interface NotifyPayload {
  type: string;
  channel: string;
  action?: string;
  entity?: string;
  data?: any;
}

export async function notifyUser(
  env: any,
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const doId = env.USER_CONNECTION_DO.idFromName(userId);
    const stub = env.USER_CONNECTION_DO.get(doId);
    await stub.fetch("http://do/notify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(`[Realtime] Failed to notify user ${userId}:`, e);
  }
}

export async function notifyUsers(
  env: any,
  userIds: string[],
  payload: NotifyPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.allSettled(userIds.map((uid) => notifyUser(env, uid, payload)));
}

export async function notifyGlobal(
  env: any,
  payload: NotifyPayload,
): Promise<void> {
  try {
    // ग्लोबल ब्रॉडकास्ट के लिए हम नए BroadcastCoordinatorDO का इस्तेमाल करेंगे
    const doId = env.BROADCAST_COORDINATOR_DO.idFromName("COORDINATOR");
    const stub = env.BROADCAST_COORDINATOR_DO.get(doId);
    await stub.fetch("http://do/broadcast", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(`[Realtime] Failed to notify globally:`, e);
  }
}

export async function notifyCourseEnrolled(
  env: any,
  DB: D1Database,
  courseId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const enrollments: any = await DB.prepare(
      "SELECT user_id FROM Enrollments WHERE course_id = ? AND (status = 'active' OR status = 'enrolled')",
    )
      .bind(courseId)
      .all();
    const userIds: string[] =
      enrollments.results?.map((r: any) => r.user_id) || [];
    if (userIds.length > 0) {
      await notifyUsers(env, userIds, payload);
    }
  } catch (e) {
    console.error(
      `[Realtime] Failed to notify course ${courseId} enrollees:`,
      e,
    );
  }
}

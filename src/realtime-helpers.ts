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
    // Send to GLOBAL_HUB with targetUserId specified in data
    const doId = env.USER_CONNECTION_DO.idFromName("GLOBAL_HUB");
    const stub = env.USER_CONNECTION_DO.get(doId);

    // Attach target user ID so DO knows who to route this to
    const modifiedPayload = {
      ...payload,
      data: {
        ...(payload.data || {}),
        _targetUserId: userId
      }
    };

    await stub.fetch("http://do/notify", {
      method: "POST",
      body: JSON.stringify(modifiedPayload),
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
    // Broadcast to everyone via GLOBAL_HUB
    const doId = env.USER_CONNECTION_DO.idFromName("GLOBAL_HUB");
    const stub = env.USER_CONNECTION_DO.get(doId);
    await stub.fetch("http://do/notify", {
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

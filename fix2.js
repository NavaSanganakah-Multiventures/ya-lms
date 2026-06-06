const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const target2 = `  // Check how many credits already charged for this session
  const alreadyCharged = await getCreditsChargedForSession(env, userId, sessionId);
  const extraCreditsNeeded = requiredCredits - alreadyCharged;

  if (extraCreditsNeeded > 0) {
    const deduction = await deductCreditsFromWallet(
      env,
      userId,
      extraCreditsNeeded,
      "group_class_duration",
      "live_session",
      sessionId,
    );
    if (!deduction.ok) {
      console.error(\`Failed to deduct \${extraCreditsNeeded} credits from user \${userId} for session \${sessionId}: insufficient balance\`);
    }
  }

  // Update prepaid bank: total paid seconds - total attended seconds
  const unitSeconds = getUnitSeconds();
  const totalPaidSeconds = requiredCredits * unitSeconds;
  const remainingSeconds = Math.max(0, totalPaidSeconds - totalSeconds);
  await setPrepaidSeconds(env, userId, sessionId, remainingSeconds);
}`;

const replacement2 = `  // Check how many credits already charged for this session
  const alreadyCharged = await getCreditsChargedForSession(env, userId, sessionId);
  const extraCreditsNeeded = requiredCredits - alreadyCharged;

  let finalChargedCredits = alreadyCharged;

  if (extraCreditsNeeded > 0) {
    const deduction = await deductCreditsFromWallet(
      env,
      userId,
      extraCreditsNeeded,
      "group_class_duration",
      "live_session",
      sessionId,
    );
    if (!deduction.ok) {
      console.error(\`Failed to deduct \${extraCreditsNeeded} credits from user \${userId} for session \${sessionId}: insufficient balance\`);
    } else {
      finalChargedCredits += extraCreditsNeeded;
    }
  }

  // Update prepaid bank: total paid seconds - total attended seconds
  const unitSeconds = getUnitSeconds();
  const totalPaidSeconds = finalChargedCredits * unitSeconds;
  const remainingSeconds = Math.max(0, totalPaidSeconds - totalSeconds);
  await setPrepaidSeconds(env, userId, sessionId, remainingSeconds);
}`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/index.ts', code);
console.log("Replaced target2");

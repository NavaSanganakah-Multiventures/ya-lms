const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const target3 = `  // Atomically charge credits and add to prepaid time bank
  const unitSeconds = getUnitSeconds();
  const ledgerId = crypto.randomUUID();
  const batchResults = await env.DB.batch([
    env.DB.prepare(
      \`UPDATE CreditWallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND balance >= ?\`,
    ).bind(rate, userId, rate),
    env.DB.prepare(
      \`INSERT INTO CreditLedger (id, user_id, change_amount, balance_after, reason, reference_type, reference_id)
       VALUES (?, ?, ?, (SELECT COALESCE(balance, 0) FROM CreditWallets WHERE user_id = ?), ?, ?, ?)\`,
    ).bind(ledgerId, userId, -rate, userId, "group_class_join", "live_session", sessionId),
    env.DB.prepare(
      \`INSERT INTO PrepaidTimeBank (user_id, session_id, prepaid_seconds, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, session_id) DO UPDATE SET
         prepaid_seconds = prepaid_seconds + ?,
         updated_at = CURRENT_TIMESTAMP\`,
    ).bind(userId, sessionId, unitSeconds, unitSeconds),
  ]);

  const walletResult = batchResults[0] as any;
  const changed = Number(walletResult?.meta?.changes || walletResult?.changes || 0);
  if (changed < 1) {
    return {
      allowed: false,
      requiredCredits: rate,
      availableCredits: balance.balance,
      maxMinutes: 0,
      message: \`इस credit-based live class में जुड़ने के लिए \${rate} self-study credits अनिवार्य हैं। कृपया credits purchase करें।\`,
    };
  }

  return { allowed: true, requiredCredits: rate, availableCredits: Math.max(0, balance.balance - rate), maxMinutes };
}`;

const replacement3 = `  // Charge credits using deductCreditsFromWallet to ensure ledger accuracy
  const deduction = await deductCreditsFromWallet(
    env,
    userId,
    rate,
    "group_class_join",
    "live_session",
    sessionId
  );

  if (!deduction.ok) {
    return {
      allowed: false,
      requiredCredits: rate,
      availableCredits: balance.balance,
      maxMinutes: 0,
      message: \`इस credit-based live class में जुड़ने के लिए \${rate} self-study credits अनिवार्य हैं। कृपया credits purchase करें।\`,
    };
  }

  // Update prepaid time bank
  const unitSeconds = getUnitSeconds();
  await env.DB.prepare(
    \`INSERT INTO PrepaidTimeBank (user_id, session_id, prepaid_seconds, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, session_id) DO UPDATE SET
       prepaid_seconds = prepaid_seconds + ?,
       updated_at = CURRENT_TIMESTAMP\`
  ).bind(userId, sessionId, unitSeconds, unitSeconds).run();

  return { allowed: true, requiredCredits: rate, availableCredits: deduction.balance, maxMinutes };
}`;

code = code.replace(target3, replacement3);
fs.writeFileSync('src/index.ts', code);
console.log("Replaced target3");

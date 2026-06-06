const fs = require('fs');
let code = fs.readFileSync('src/index.ts', 'utf8');

const targetAdd = `async function addCreditsToWallet(
  env: Env,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ balance: number; lifetime_credits: number }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  if (safeAmount <= 0) return await getCreditBalance(env, userId);

  await env.DB.prepare(
    \`INSERT INTO CreditWallets (id, user_id, balance, lifetime_credits, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       balance = balance + ?,
       lifetime_credits = lifetime_credits + ?,
       updated_at = CURRENT_TIMESTAMP\`,
  )
    .bind(crypto.randomUUID(), userId, safeAmount, safeAmount, safeAmount, safeAmount)
    .run();

  const balance = await getCreditBalance(env, userId);
  await env.DB.prepare(
    \`INSERT INTO CreditLedger (id, user_id, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)\`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      safeAmount,
      balance.balance,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return balance;
}`;

const replacementAdd = `async function addCreditsToWallet(
  env: Env,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ balance: number; lifetime_credits: number }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  if (safeAmount <= 0) return await getCreditBalance(env, userId);

  const result = (await env.DB.prepare(
    \`INSERT INTO CreditWallets (id, user_id, balance, lifetime_credits, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id) DO UPDATE SET
       balance = balance + ?,
       lifetime_credits = lifetime_credits + ?,
       updated_at = CURRENT_TIMESTAMP
     RETURNING balance, lifetime_credits\`,
  )
    .bind(crypto.randomUUID(), userId, safeAmount, safeAmount, safeAmount, safeAmount)
    .first()) as any;

  const currentBalance = Number(result?.balance || 0);

  await env.DB.prepare(
    \`INSERT INTO CreditLedger (id, user_id, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)\`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      safeAmount,
      currentBalance,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return { balance: currentBalance, lifetime_credits: Number(result?.lifetime_credits || 0) };
}`;

const targetDeduct = `async function deductCreditsFromWallet(
  env: Env,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ ok: boolean; balance: number }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  const before = await getCreditBalance(env, userId);
  if (safeAmount <= 0) return { ok: true, balance: before.balance };

  const updateResult = (await env.DB.prepare(
    \`UPDATE CreditWallets
     SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND balance >= ?\`,
  )
    .bind(safeAmount, userId, safeAmount)
    .run()) as any;

  const changed = Number(updateResult?.meta?.changes || updateResult?.changes || 0);
  if (changed < 1) {
    return { ok: false, balance: before.balance };
  }

  const balance = await getCreditBalance(env, userId);
  await env.DB.prepare(
    \`INSERT INTO CreditLedger (id, user_id, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)\`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      -safeAmount,
      balance.balance,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return { ok: true, balance: balance.balance };
}`;

const replacementDeduct = `async function deductCreditsFromWallet(
  env: Env,
  userId: string,
  amount: number,
  reason: string,
  referenceType?: string,
  referenceId?: string,
): Promise<{ ok: boolean; balance: number }> {
  const safeAmount = normalizeNonNegativeInt(amount);
  const before = await getCreditBalance(env, userId);
  if (safeAmount <= 0) return { ok: true, balance: before.balance };

  const result = (await env.DB.prepare(
    \`UPDATE CreditWallets
     SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND balance >= ?
     RETURNING balance\`,
  )
    .bind(safeAmount, userId, safeAmount)
    .first()) as any;

  if (!result || result.balance === undefined) {
    return { ok: false, balance: before.balance };
  }

  const newBalance = Number(result.balance);

  await env.DB.prepare(
    \`INSERT INTO CreditLedger (id, user_id, change_amount, balance_after, reason, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)\`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      -safeAmount,
      newBalance,
      reason,
      referenceType || null,
      referenceId || null,
    )
    .run();

  return { ok: true, balance: newBalance };
}`;

code = code.replace(targetAdd, replacementAdd);
code = code.replace(targetDeduct, replacementDeduct);
fs.writeFileSync('src/index.ts', code);
console.log("Replaced targetAdd and targetDeduct");

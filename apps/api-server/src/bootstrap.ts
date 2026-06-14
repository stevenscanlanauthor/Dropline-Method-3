import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, usersTable } from '@dropline/db';
import { eq } from 'drizzle-orm';

export async function ensureInitialAdmin(): Promise<void> {
  const email = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD?.trim();
  if (!email || !password) return;

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    await db
      .update(usersTable)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(eq(usersTable.id, existing[0].id));
    return;
  }

  const now = new Date();
  await db.insert(usersTable).values({
    id: uuidv4(),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    displayName: 'Admin',
    isAdmin: true,
    isDisabled: false,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`[bootstrap] Created admin account for ${email}`);
}

import { eq } from 'drizzle-orm';
import { db, usersTable, booksTable, entitlementsTable, purchasesTable } from '@dropline/db';

/** Dropline App Review demo accounts — must not be self-deleted. */
export const PROTECTED_ACCOUNT_EMAILS = new Set([
  'apple-review@droplinemethod.com',
  'apple-review-expired@droplinemethod.com',
]);

export async function deleteUserAndData(userId: string): Promise<void> {
  await db.transaction(async tx => {
    await tx.delete(purchasesTable).where(eq(purchasesTable.userId, userId));
    await tx.delete(entitlementsTable).where(eq(entitlementsTable.userId, userId));
    await tx.delete(booksTable).where(eq(booksTable.userId, userId));
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
}

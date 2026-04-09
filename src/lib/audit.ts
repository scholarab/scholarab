import { db } from './db/client'
import { auditLog } from './db/schema'

export async function logAudit(
  userId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  resourceType: 'scholarship' | 'program',
  resourceId: number,
): Promise<void> {
  await db.insert(auditLog).values({ userId, action, resourceType, resourceId })
}

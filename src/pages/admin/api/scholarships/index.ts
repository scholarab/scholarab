import { makeAdminCollectionRoutes } from '../../../../lib/admin-crud'
import { scholarshipCreateSchema, scholarshipUpdateSchema } from '../../../../lib/admin-schemas'
import { scholarships } from '../../../../lib/db/schema'

export const prerender = false

export const { GET, POST } = makeAdminCollectionRoutes({
  table: scholarships,
  idColumn: scholarships.id,
  updatedAtColumn: scholarships.updatedAt,
  dupColumn: scholarships.title,
  dupField: 'title',
  createSchema: scholarshipCreateSchema,
  updateSchema: scholarshipUpdateSchema,
  logTag: 'scholarships',
})

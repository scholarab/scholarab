import { makeAdminCollectionRoutes } from '../../../../lib/admin-crud'
import { scholarshipCreateSchema, scholarshipUpdateSchema } from '../../../../lib/admin-schemas'

export const prerender = false

export const { GET, POST } = makeAdminCollectionRoutes({
  kind: 'scholarship',
  createSchema: scholarshipCreateSchema,
  updateSchema: scholarshipUpdateSchema,
})

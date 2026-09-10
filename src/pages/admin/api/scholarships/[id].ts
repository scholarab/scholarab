import { makeAdminItemRoutes } from '../../../../lib/admin-crud'
import { scholarshipCreateSchema, scholarshipUpdateSchema } from '../../../../lib/admin-schemas'

export const prerender = false

export const { GET, PUT, DELETE } = makeAdminItemRoutes({
  kind: 'scholarship',
  createSchema: scholarshipCreateSchema,
  updateSchema: scholarshipUpdateSchema,
})

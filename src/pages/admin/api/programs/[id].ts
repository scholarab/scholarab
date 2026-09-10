import { makeAdminItemRoutes } from '../../../../lib/admin-crud'
import { programCreateSchema, programUpdateSchema } from '../../../../lib/admin-schemas'

export const prerender = false

export const { GET, PUT, DELETE } = makeAdminItemRoutes({
  kind: 'program',
  createSchema: programCreateSchema,
  updateSchema: programUpdateSchema,
})

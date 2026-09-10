import { makeAdminCollectionRoutes } from '../../../../lib/admin-crud'
import { programCreateSchema, programUpdateSchema } from '../../../../lib/admin-schemas'

export const prerender = false

export const { GET, POST } = makeAdminCollectionRoutes({
  kind: 'program',
  createSchema: programCreateSchema,
  updateSchema: programUpdateSchema,
})

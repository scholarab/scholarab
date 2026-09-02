import { makeAdminItemRoutes } from '../../../../lib/admin-crud'
import { programCreateSchema, programUpdateSchema } from '../../../../lib/admin-schemas'
import { researchPrograms } from '../../../../lib/db/schema'

export const prerender = false

export const { GET, PUT, DELETE } = makeAdminItemRoutes({
  table: researchPrograms,
  idColumn: researchPrograms.id,
  updatedAtColumn: researchPrograms.updatedAt,
  dupColumn: researchPrograms.name,
  dupField: 'name',
  createSchema: programCreateSchema,
  updateSchema: programUpdateSchema,
  logTag: 'programs',
})

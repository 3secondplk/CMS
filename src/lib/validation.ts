import { z } from 'zod'

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

export const sortSchema = z.object({
  sortField: z.string().max(50).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(1000),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1000),
  newPassword: z.string().min(8).max(1000),
})

// Claims schemas
export const claimSaleSchema = z.object({
  saleIds: z.array(z.string().max(100)).min(1).max(500),
})

export const bulkEditSchema = z.object({
  saleIds: z.array(z.string().max(100)).min(1).max(500),
  fields: z.record(z.string(), z.union([z.string().max(500), z.number(), z.null()])).refine(
    (fields) => Object.keys(fields).length <= 20,
    { message: 'Too many fields' }
  ),
})

// Crew schemas
export const crewCreateSchema = z.object({
  name: z.string().min(1).max(200),
  employeeId: z.string().min(1).max(50),
  groupId: z.string().min(1).max(100),
  photo: z.string().max(10000).optional(),
})

export const crewUpdateSchema = crewCreateSchema.partial().extend({
  id: z.string().min(1).max(100),
})

// Group schemas
export const groupCreateSchema = z.object({
  name: z.string().min(1).max(200),
  monthlyTarget: z.number().min(0).optional(),
  week1Target: z.number().min(0).max(100).optional(),
  week2Target: z.number().min(0).max(100).optional(),
  week3Target: z.number().min(0).max(100).optional(),
  week4Target: z.number().min(0).max(100).optional(),
  week5Target: z.number().min(0).max(100).optional(),
  tiktokActive: z.boolean().optional(),
  logo: z.string().max(10000).optional(),
})

export const groupUpdateSchema = groupCreateSchema.partial().extend({
  id: z.string().min(1).max(100),
})

// Dashboard schemas
export const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
})

export const groupDetailQuerySchema = z.object({
  groupId: z.string().min(1).max(100),
  period: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
})

// TikTok sale schemas
export const tiktokSaleCreateSchema = z.object({
  tanggal: z.string().min(1).max(20),
  idOrder: z.string().min(1).max(100),
  artikel: z.string().min(1).max(500),
  size: z.string().max(50).optional(),
  qty: z.number().int().min(0).default(1),
  revenue: z.number().min(0).default(0),
  settle: z.number().min(0).default(0),
  status: z.enum(['Pengiriman', 'Selesai', 'Retur', 'Batal']).default('Pengiriman'),
  crewId: z.string().max(100).optional(),
})

// Sort field whitelists
export const CLAIM_SORT_FIELDS = ['tanggal', 'kodeExtend', 'settle', 'qty', 'claimedAt', 'createdAt'] as const
export const TIKTOK_SORT_FIELDS = ['tanggal', 'idOrder', 'revenue', 'settle', 'status', 'createdAt'] as const

// ID validation
export const idSchema = z.string().min(1).max(100)

// Search/query validation
export const searchSchema = z.object({
  q: z.string().max(500).optional(),
  query: z.string().max(500).optional(),
})

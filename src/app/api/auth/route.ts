import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as crypto from 'crypto'

// GET /api/auth/setup — Create default admin if not exists
// Call this from browser after deploy to verify DB is working
export async function GET() {
  try {
    const count = await db.admin.count()

    if (count > 0) {
      const admins = await db.admin.findMany({ select: { id: true, username: true, name: true, createdAt: true } })
      return NextResponse.json({
        ok: true,
        message: `Admin already exists (${count})`,
        admins,
      })
    }

    // Create default admin
    const hashedPassword = crypto.createHash('sha256').update('admin123').digest('hex')
    const admin = await db.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'Default admin created successfully',
      admin: { id: admin.id, username: admin.username, name: admin.name },
      login: 'admin / admin123',
    })
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message || 'DB connection failed',
      hint: 'Check DATABASE_URL and prisma schema (must be postgresql for Neon)',
    }, { status: 500 })
  }
}

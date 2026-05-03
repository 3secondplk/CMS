import { NextResponse } from 'next/server'

// GET /api/health — Health check endpoint (no database dependency)
export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '3.0',
    })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

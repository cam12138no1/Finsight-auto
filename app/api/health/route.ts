import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query<{ time: string; version: string }>('SELECT NOW() as time, version() as version');
    const row = result.rows[0];
    const versionParts = row?.version ? String(row.version).split(' ') : [];
    return NextResponse.json({
      status: 'healthy',
      database: {
        status: 'connected',
        version: versionParts.slice(0, 2).join(' '),
      },
      timestamp: row?.time,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: {
          status: 'disconnected',
          error: String(error),
        },
      },
      { status: 503 }
    );
  }
}

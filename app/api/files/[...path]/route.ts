import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Whitelist of allowed tables — prevents SQL injection
const TABLE_MAP: Record<string, string> = {
  filing: 'shared_filings',
  report: 'user_reports',
};

// GET /api/files/filing/{id} — Download a shared filing from DB
// GET /api/files/report/{id} — Download a user report from DB
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const [type, id] = params.path;

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const table = TABLE_MAP[type];
    if (!table) {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    const result = await query(
      `SELECT filename, content_type, file_content FROM ${table} WHERE id = $1`,
      [numId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const row = result.rows[0] as Record<string, unknown>;
    const content = row.file_content as Buffer | null;
    if (!content || content.length === 0) {
      return NextResponse.json({ error: 'File content is empty' }, { status: 404 });
    }

    const filename = (row.filename as string) || 'download';
    const contentType = (row.content_type as string) || 'application/octet-stream';

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const body = new Uint8Array(content);

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(body.length),
      },
    });
  } catch (error) {
    console.error('[File Download] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

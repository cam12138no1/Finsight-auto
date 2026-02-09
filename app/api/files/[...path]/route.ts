import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    let table: string;
    if (type === 'filing') {
      table = 'shared_filings';
    } else if (type === 'report') {
      table = 'user_reports';
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    const result = await query(
      `SELECT filename, content_type, file_content FROM ${table} WHERE id = $1`,
      [numId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const row = result.rows[0] as Record<string, any>;
    const content = row.file_content as Buffer;
    const filename = row.filename as string;
    const contentType = row.content_type as string || 'application/octet-stream';

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(content.length),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_API_URL || 'http://localhost:8000';

// GET: Proxy file download from worker
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const filePath = params.path.join('/');

    const res = await fetch(`${WORKER_URL}/files/${filePath}`, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const filename = filePath.split('/').pop() || 'report';

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(body.byteLength),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

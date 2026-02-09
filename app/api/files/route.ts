import { NextRequest, NextResponse } from 'next/server';

const WORKER_URL = process.env.WORKER_API_URL || 'http://localhost:8000';

// GET: List available report files
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || '';
    const company = searchParams.get('company') || '';

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (company) params.set('company', company);

    const res = await fetch(`${WORKER_URL}/files?${params}`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Worker service unavailable' },
        { status: 503 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

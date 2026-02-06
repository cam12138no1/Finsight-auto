import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Company, ApiResponse } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let sql = 'SELECT * FROM companies WHERE is_active = true';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (search) {
      sql += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(ticker) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    sql += ' ORDER BY category, name';

    const result = await query<Company>(sql, params);
    return NextResponse.json({ success: true, data: result.rows } satisfies ApiResponse<Company[]>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

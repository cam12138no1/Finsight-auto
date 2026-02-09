import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ApiResponse } from '@/types';

// GET: List user-uploaded research reports
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('company_id');

    let sql = `
      SELECT ur.id, ur.uploader_name, ur.company_id, ur.title, ur.description,
             ur.year, ur.quarter, ur.filename, ur.content_type, ur.file_size, ur.created_at,
             c.name as company_name, c.ticker as company_ticker
      FROM user_reports ur
      LEFT JOIN companies c ON ur.company_id = c.id
    `;
    const params: unknown[] = [];
    if (companyId) {
      sql += ' WHERE ur.company_id = $1';
      params.push(parseInt(companyId));
    }
    sql += ' ORDER BY ur.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

// POST: Upload a research report
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const uploaderName = (formData.get('uploader_name') as string) || 'anonymous';
    const companyId = formData.get('company_id') as string | null;
    const year = formData.get('year') as string | null;
    const quarter = formData.get('quarter') as string | null;
    const description = (formData.get('description') as string) || '';

    if (!file || !title) {
      return NextResponse.json(
        { success: false, error: '请提供文件和标题' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: '文件不能超过 50MB' },
        { status: 413 }
      );
    }

    const result = await query(
      `INSERT INTO user_reports
         (uploader_name, company_id, title, description, year, quarter,
          filename, content_type, file_size, file_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        uploaderName,
        companyId ? parseInt(companyId) : null,
        title,
        description,
        year ? parseInt(year) : null,
        quarter || null,
        file.name,
        file.type || 'application/octet-stream',
        buffer.length,
        buffer,
      ]
    );

    return NextResponse.json(
      { success: true, data: { id: result.rows[0]?.id }, message: '研报上传成功' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

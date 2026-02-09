import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE: Delete a user report
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const result = await query(
      'DELETE FROM user_reports WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: '研报不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: '研报已删除' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { bibleService } from '@/lib/server/bible-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const scope = searchParams.get('scope') || 'all';
    const section = searchParams.get('section');
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const data = bibleService.search(q, {
      scope,
      sectionId: section ? parseInt(section, 10) : undefined,
      page: page ? parseInt(page, 10) : (offset ? Math.floor(parseInt(offset, 10) / (limit ? parseInt(limit, 10) : 20)) + 1 : 1),
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return NextResponse.json({ status: 'success', success: true, data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', success: false, error: { message: error.message } }, { status: 500 });
  }
}

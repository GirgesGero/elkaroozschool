import { NextRequest, NextResponse } from 'next/server';
import { bibleService } from '@/lib/server/bible-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (!idParam) {
      return NextResponse.json({ status: 'error', success: false, error: { message: 'Missing section id' } }, { status: 400 });
    }

    const sectionId = parseInt(idParam, 10);
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const data = bibleService.getSectionArticles(sectionId, page, limit);
    return NextResponse.json({ status: 'success', success: true, data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', success: false, error: { message: error.message } }, { status: 500 });
  }
}

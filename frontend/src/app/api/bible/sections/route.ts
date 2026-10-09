import { NextRequest, NextResponse } from 'next/server';
import { bibleService } from '@/lib/server/bible-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped');
    const category = searchParams.get('category');

    if (grouped === '1' || grouped === 'true') {
      const data = bibleService.getCategoriesAndSections();
      return NextResponse.json({ status: 'success', success: true, data });
    }

    const data = bibleService.getSections(category || undefined);
    return NextResponse.json({ status: 'success', success: true, data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', success: false, error: { message: error.message } }, { status: 500 });
  }
}

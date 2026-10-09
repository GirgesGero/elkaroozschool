import { NextRequest, NextResponse } from 'next/server';
import { bibleService } from '@/lib/server/bible-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const path = searchParams.get('path');
    const book = searchParams.get('book');
    const ch = searchParams.get('ch');

    const lookup: any = {};
    if (id) lookup.id = parseInt(id, 10);
    if (slug) lookup.slug = slug;
    if (path) lookup.path = path;
    if (book && ch) {
      lookup.book = book;
      lookup.ch = parseInt(ch, 10);
    }

    if (Object.keys(lookup).length === 0) {
      return NextResponse.json({ status: 'error', success: false, error: { message: 'Missing article identifier (id, slug, path, or book+ch)' } }, { status: 400 });
    }

    const article = bibleService.getArticle(lookup);
    if (!article) {
      return NextResponse.json({ status: 'error', success: false, error: { message: 'المحتوى المطلوب غير موجود في الموسوعة' } }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', success: true, data: article });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', success: false, error: { message: error.message } }, { status: 500 });
  }
}

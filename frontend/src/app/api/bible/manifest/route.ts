import { NextResponse } from 'next/server';
import { bibleService } from '@/lib/server/bible-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = bibleService.getManifest();
    return NextResponse.json({ status: 'success', success: true, data });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', success: false, error: { message: error.message } }, { status: 500 });
  }
}

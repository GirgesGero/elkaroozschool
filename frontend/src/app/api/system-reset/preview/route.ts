import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function backendUrl(path: string): string {
  const configured = process.env.PHP_API_URL;
  if (!configured || !configured.trim()) throw new Error('RESET_BACKEND_URL_MISSING');
  const base = configured.trim().replace(/\/+$/, '');
  return `${base.endsWith('/api') ? base : `${base}/api`}${path}`;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return NextResponse.json({ status: 'error', code: 'UNAUTHORIZED', message: 'المصادقة مطلوبة: التوكن غير موجود' }, { status: 401 });
  }
  try {
    const upstream = await fetch(backendUrl('/system-reset/preview'), {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: authorization, 'X-Authorization': authorization },
      cache: 'no-store',
      signal: AbortSignal.timeout(180_000),
    });
    if (!(upstream.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ status: 'error', code: 'RESET_BACKEND_UNAVAILABLE', message: 'خادم إعادة الضبط لم يرجع استجابة JSON صالحة.' }, { status: 502 });
    }
    return NextResponse.json(await upstream.json(), { status: upstream.status });
  } catch (error) {
    const configured = error instanceof Error && error.message === 'RESET_BACKEND_URL_MISSING';
    return NextResponse.json({ status: 'error', code: configured ? 'RESET_CONFIGURATION_ERROR' : 'RESET_BACKEND_UNAVAILABLE', message: 'تعذر الاتصال بخدمة إعادة الضبط الموثوقة.' }, { status: configured ? 503 : 502 });
  }
}

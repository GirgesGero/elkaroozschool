import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    message: 'خادم الواجهة البرمجية المدمج يعمل بكفاءة وسرعة فائقة',
    data: {
      service: 'EL KAROOZ Native Next.js Bible API',
      status: 'ONLINE',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    }
  });
}

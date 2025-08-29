import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    const type = searchParams.get('type') || 'movie';
    if (!providerValue || !link) {
      return NextResponse.json({error: 'provider and link required'}, {status: 400});
    }
    const modules = await fetchProviderModules(providerValue);
    const streamModule = modules.stream ? executeModule(modules.stream) : {};
    const controller = new AbortController();
    const getStream =
      (streamModule as any).getStream ||
      (streamModule as any).default?.getStream ||
      (streamModule as any).stream ||
      (streamModule as any).default?.stream;

    const data = await getStream?.({
      link,
      type,
      signal: controller.signal,
      providerContext,
    });

    return NextResponse.json({data: data || []});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}



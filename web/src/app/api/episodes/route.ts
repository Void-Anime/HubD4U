import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const url = searchParams.get('url') || '';
    if (!providerValue || !url) {
      return NextResponse.json({error: 'provider and url required'}, {status: 400});
    }
    const modules = await fetchProviderModules(providerValue);
    const streamModule = modules.stream ? executeModule(modules.stream) : {};
    const getEpisodeLinks =
      (streamModule as any).getEpisodeLinks ||
      (streamModule as any).default?.getEpisodeLinks ||
      (streamModule as any).GetEpisodeLinks ||
      (streamModule as any).default?.GetEpisodeLinks;

    if (!getEpisodeLinks) {
      return NextResponse.json({data: []});
    }

    const data = await getEpisodeLinks({
      url,
      providerContext,
    });

    return NextResponse.json({data: Array.isArray(data) ? data : []});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}



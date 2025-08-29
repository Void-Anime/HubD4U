import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    if (!providerValue || !link) {
      return NextResponse.json({error: 'provider and link required'}, {status: 400});
    }
    const modules = await fetchProviderModules(providerValue);
    const metaModule = modules.meta ? executeModule(modules.meta) : {};

    const data = await metaModule.getMeta?.({
      link,
      provider: providerValue,
      providerContext,
    });

    return NextResponse.json({data});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}



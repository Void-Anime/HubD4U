import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const q = searchParams.get('q') || '';
    const page = Number(searchParams.get('page') || '1');
    if (!providerValue || !q) {
      return NextResponse.json({error: 'provider and q required'}, {status: 400});
    }
    const modules = await fetchProviderModules(providerValue);
    const postsModule = modules.posts ? executeModule(modules.posts) : {};

    const controller = new AbortController();
    const data = await postsModule.getSearchPosts?.({
      searchQuery: q,
      page,
      providerValue,
      signal: controller.signal,
      providerContext,
    });

    return NextResponse.json({data: data || []});
  } catch (e: any) {
    return NextResponse.json({error: e?.message || 'error'}, {status: 500});
  }
}



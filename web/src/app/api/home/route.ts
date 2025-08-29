import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const page = Number(searchParams.get('page') || '1');
    if (!providerValue) {
      return NextResponse.json({error: 'provider required'}, {status: 400});
    }
    const modules = await fetchProviderModules(providerValue);
    const catalogModule = modules.catalog ? executeModule<any>(modules.catalog) : {};

    const catalog = (catalogModule.catalog || catalogModule.default?.catalog || []) as Array<{title: string; filter: string}>;

    // Fetch first page of each catalog section (limited)
    const controller = new AbortController();
    const sections = (catalog || []).slice(0, 4);
    const data = await Promise.all(
      sections.map(async sec => {
        try {
          const pm = modules.posts ? executeModule<any>(modules.posts) : {};
          const callable =
            pm.getPosts ||
            pm.default?.getPosts ||
            pm.posts ||
            pm.default?.posts;
          if (!callable) {
            console.warn('No getPosts found for provider', providerValue);
            return {title: sec.title, filter: sec.filter, Posts: []};
          }
          const Posts = await callable({
            filter: sec.filter,
            page,
            providerValue,
            signal: controller.signal,
            providerContext,
          });
          return {title: sec.title, filter: sec.filter, Posts: Posts || []};
        } catch (err: any) {
          const message = err?.message || String(err);
          console.error('Error in getPosts for', sec.filter, message);
          return {title: sec.title, filter: sec.filter, Posts: [], error: message};
        }
      }),
    );

    return NextResponse.json({catalog, data});
  } catch (e: any) {
    console.error('HOME API error', e);
    return NextResponse.json({catalog: [], data: [], error: e?.message || 'error'});
  }
}



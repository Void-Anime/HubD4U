import axios from 'axios';
import * as cheerio from 'cheerio';
import {headers} from './headers';
import {getBaseUrl} from './getBaseUrl';
import {superVideoExtractor} from './extractors/superVideo';
import {gdFlixExtracter} from './extractors/gdflix';
import {hubcloudExtracter} from './extractors/hubcloud';
import {gofileExtracter} from './extractors/gofile';

export const providerContext = {
  axios,
  getBaseUrl,
  commonHeaders: headers,
  // Node: no expo-crypto; include a compatible subset if needed later
  Crypto: {} as any,
  cheerio,
  extractors: {
    // For now, omit specialized extractors; providers using them should be updated later
    // You can implement Node versions and wire them here.
    hubcloudExtracter,
    gofileExtracter: async () => ({link: '', token: ''}),
    // replace with node implementation
    gofileExtracter,
    superVideoExtractor,
    gdFlixExtracter,
  },
};

export type ProviderContext = typeof providerContext;



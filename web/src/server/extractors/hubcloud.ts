import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function decode(value: string) {
  if (!value) return '';
  try {
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export async function hubcloudExtracter(link: string, signal: AbortSignal) {
  try {
    const baseUrl = link.split('/').slice(0, 3).join('/');
    const streamLinks: {server: string; link: string; type: string}[] = [];
    const vLinkRes = await axios.get(`${link}`, {headers, signal});
    const vLinkText = vLinkRes.data;
    const $vLink = cheerio.load(vLinkText);
    const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*'([^']+)';/) || [];
    let vcloudLink =
      decode(vLinkRedirect[1]?.split('r=')?.[1]) ||
      vLinkRedirect[1] ||
      $vLink('.fa-file-download.fa-lg').parent().attr('href') ||
      link;
    if (vcloudLink?.startsWith('/')) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
    }
    const vcloudRes = await fetch(vcloudLink, {headers, signal, redirect: 'follow'});
    const $ = cheerio.load(await vcloudRes.text());

    const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary');
    for (const element of linkClass) {
      const itm = $(element);
      let lnk = itm.attr('href') || '';
      if (lnk?.includes('.dev') && !lnk?.includes('/?id=')) {
        streamLinks.push({server: 'Cf Worker', link: lnk, type: 'mkv'});
      }
      if (lnk?.includes('pixeld')) {
        if (!lnk?.includes('api')) {
          const token = lnk.split('/').pop();
          const base = lnk.split('/').slice(0, -2).join('/');
          lnk = `${base}/api/file/${token}?download`;
        }
        streamLinks.push({server: 'Pixeldrain', link: lnk, type: 'mkv'});
      }
      if (lnk?.includes('hubcloud') || lnk?.includes('/?id=')) {
        try {
          const newLinkRes = await axios.head(lnk, {headers, signal});
          const newLink = newLinkRes.request?.responseURL?.split('link=')?.[1] || lnk;
          streamLinks.push({server: 'hubcloud', link: newLink, type: 'mkv'});
        } catch {}
      }
      if (lnk?.includes('cloudflarestorage')) {
        streamLinks.push({server: 'CfStorage', link: lnk, type: 'mkv'});
      }
      if (lnk?.includes('fastdl')) {
        streamLinks.push({server: 'FastDl', link: lnk, type: 'mkv'});
      }
      if (lnk.includes('hubcdn')) {
        streamLinks.push({server: 'HubCdn', link: lnk, type: 'mkv'});
      }
    }
    return streamLinks;
  } catch {
    return [];
  }
}



import axios from 'axios';
import * as cheerio from 'cheerio';

export async function gdFlixExtracter(link: string, signal: AbortSignal) {
  try {
    const streamLinks: {server: string; link: string; type: string}[] = [];
    const res = await axios.get(`${link}`, {signal});
    let $drive = cheerio.load(res.data);

    if ($drive('body').attr('onload')?.includes('location.replace')) {
      const newLink = $drive('body')
        .attr('onload')
        ?.split("location.replace('")?.[1]
        .split("'")?.[0];
      if (newLink) {
        const newRes = await axios.get(newLink, {signal});
        $drive = cheerio.load(newRes.data);
      }
    }

    try {
      const r2Link =
        $drive('..btn.btn-outline-success').attr('href') ||
        $drive('a:contains("CLOUD DOWNLOAD")').attr('href') ||
        '';
      if (r2Link) {
        streamLinks.push({server: 'R2', link: r2Link, type: 'mkv'});
      }
    } catch {}

    try {
      const pixelDrainLink = $drive('.btn.btn-success').attr('href') || '';
      if (pixelDrainLink) {
        streamLinks.push({server: 'PixelDrain', link: pixelDrainLink, type: 'mkv'});
      }
    } catch {}

    return streamLinks;
  } catch {
    return [];
  }
}



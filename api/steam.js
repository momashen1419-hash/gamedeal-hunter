// api/steam.js - Vercel Serverless Function
// 負責直接向 Steam 官方伺服器請求台灣區 (cc=tw) 與繁體中文 (l=tchinese) 即時價格

export default async function handler(req, res) {
  // 允許跨域並設定 Vercel CDN 快取 5 分鐘，加快載入速度並避免觸發 Steam 請求頻率限制
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type = 'featured', term = '', appids = '' } = req.query;

  try {
    let targetUrl = '';

    if (type === 'featured') {
      // 抓取台灣區 Steam 首頁特惠 (specials) 與熱銷榜 (top_sellers)
      targetUrl = 'https://store.steampowered.com/api/featuredcategories?cc=tw&l=tchinese';
    } else if (type === 'search') {
      // 台灣區繁體中文關鍵字搜尋
      targetUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=tchinese&cc=tw`;
    } else if (type === 'price_batch') {
      // 批次查詢指定 AppID 的台灣區即時價格 (filters=price_overview 支援逗號分隔多筆 AppID)
      targetUrl = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appids)}&cc=tw&filters=price_overview`;
    } else if (type === 'details') {
      // 查詢單一遊戲完整繁中詳情
      targetUrl = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appids)}&cc=tw&l=tchinese`;
    } else {
      return res.status(400).json({ error: '不支援的查詢類型' });
    }

    const response = await fetch(targetUrl, {
      headers: {
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Steam API 回應錯誤: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
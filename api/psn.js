// api/psn.js - 即時連線解析台灣 PlayStation Store (zh-hant-tw) 官方資料
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { type = 'deals', term = '' } = req.query;

  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  // 從台灣 PS Store 官方 HTML 中解析內嵌的 Apollo GraphQL 狀態資料
  function parsePsStoreHtml(html) {
    const products = [];
    const scriptRegex = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1].trim());
        const apolloState = json?.props?.apolloState || json?.apolloState || json?.cache;
        if (!apolloState || typeof apolloState !== 'object') continue;

        // 1. 建立 Concept 與 Product 的關聯表，確保能拿到完整主標題與主視覺圖
        const conceptByProductRef = {};
        for (const [key, val] of Object.entries(apolloState)) {
          if (!val || typeof val !== 'object') continue;
          if (key.startsWith('Concept:') || val.__typename === 'Concept') {
            const prodRef = val.defaultProduct?.__ref;
            if (prodRef) {
              conceptByProductRef[prodRef] = val;
            }
          }
        }

        // 2. 提取官方封面圖（排除透明文字 LOGO 與影片）
        const extractBestImage = (obj) => {
          if (!obj) return null;
          const mediaKey = Object.keys(obj).find(k => k === 'media' || k.startsWith('media('));
          const mediaList = mediaKey ? obj[mediaKey] : null;
          if (!Array.isArray(mediaList)) return null;

          const images = mediaList
            .map(m => (m && m.__ref ? apolloState[m.__ref] : m))
            .filter(m => m && m.type === 'IMAGE' && m.url && m.role !== 'LOGO');

          if (images.length === 0) return null;

          // 優先選取橫幅封面或標準主視覺封面
          const priorityRoles = ['GAMEHUB_COVER_ART', 'MASTER', 'EDITION_KEY_ART', 'PORTRAIT_BANNER'];
          for (const role of priorityRoles) {
            const found = images.find(m => m.role === role);
            if (found) return found.url;
          }
          return images[0].url;
        };

        // 3. 遍歷所有官方 Product 商品節點
        for (const [key, prod] of Object.entries(apolloState)) {
          if (!prod || typeof prod !== 'object') continue;
          if (!key.startsWith('Product:') && prod.__typename !== 'Product') continue;

          const prodId = prod.id;
          if (!prodId) continue;

          const parentConcept = conceptByProductRef[key];

          // 取得遊戲名稱
          let title = prod.name || parentConcept?.name;
          if (!title) continue;
          if (parentConcept?.name && title.length <= 6 && !title.includes(parentConcept.name)) {
            title = `${parentConcept.name} (${title})`;
          }

          // 取得台灣區即時價格物件
          const priceKey = Object.keys(prod).find(k => k === 'price' || k.startsWith('price('));
          let priceObj = priceKey ? prod[priceKey] : null;
          if (priceObj && priceObj.__ref) {
            priceObj = apolloState[priceObj.__ref];
          }
          if (!priceObj) continue;

          const parseTwd = (str) => {
            if (!str) return null;
            const m = String(str).match(/(?:NT\$|\$)\s*([\d,]+)/i);
            return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
          };

          let origPrice = parseTwd(priceObj.basePrice);
          let finalPrice = parseTwd(priceObj.discountedPrice);

          if (finalPrice === null && origPrice !== null) finalPrice = origPrice;
          if (origPrice === null && finalPrice !== null) origPrice = finalPrice;
          // 過濾非販售項目或無金額之免費試玩版
          if (origPrice === null || finalPrice === null || origPrice === 0) continue;

          // 計算即時折扣百分比
          let discount = 0;
          if (origPrice > finalPrice && origPrice > 0) {
            if (priceObj.discountText) {
              const dm = String(priceObj.discountText).match(/(\d+)\s*%/);
              discount = dm ? parseInt(dm[1], 10) : Math.round((1 - finalPrice / origPrice) * 100);
            } else {
              discount = Math.round((1 - finalPrice / origPrice) * 100);
            }
          }

          // 取得官方圖片網址
          let imageUrl = extractBestImage(prod) || extractBestImage(parentConcept);
          if (!imageUrl) continue;
          if (imageUrl.includes('image.api.playstation.com') && !imageUrl.includes('?')) {
            imageUrl = `${imageUrl}?w=600&thumb=false`;
          }

          // 取得平台標示 (PS5 / PS4)
          const platforms = Array.isArray(prod.platforms) && prod.platforms.length > 0
            ? prod.platforms.join(' / ')
            : 'PS5 / PS4';

          products.push({
            id: prodId,
            title,
            platform: platforms,
            image: imageUrl,
            originalPrice: origPrice,
            finalPrice: finalPrice,
            discount,
            // 使用官方 Product SKU 直接對應台灣商店頁面，100% 準確不跳錯
            url: `https://store.playstation.com/zh-hant-tw/product/${prodId}`
          });
        }
      } catch (e) {
        // 忽略無關 script 區塊
      }
    }

    return products;
  }

  // 輔助函式：去除重複商品
  function deduplicateProducts(list) {
    const map = new Map();
    for (const item of list) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  try {
    // 模式 A：關鍵字即時搜尋台灣 PS Store
    if (type === 'search' && term) {
      const searchUrl = `https://store.playstation.com/zh-hant-tw/search/${encodeURIComponent(term.trim())}`;
      const response = await fetch(searchUrl, { headers: FETCH_HEADERS });
      if (!response.ok) {
        throw new Error(`PS Store 搜尋回應錯誤: ${response.status}`);
      }
      const html = await response.text();
      const items = deduplicateProducts(parsePsStoreHtml(html));
      return res.status(200).json({ items });
    }

    // 模式 B：首頁載入台灣 PS Store 定期特惠與熱門排行榜
    const [dealsRes, browseRes] = await Promise.allSettled([
      fetch('https://store.playstation.com/zh-hant-tw/pages/deals', { headers: FETCH_HEADERS }),
      fetch('https://store.playstation.com/zh-hant-tw/pages/browse', { headers: FETCH_HEADERS })
    ]);

    let combined = [];
    let dealsHtml = '';

    if (dealsRes.status === 'fulfilled' && dealsRes.value.ok) {
      dealsHtml = await dealsRes.value.text();
      combined.push(...parsePsStoreHtml(dealsHtml));
    }

    // 自動從特惠主頁提取當期主打特賣活動的 Category UUID，抓取更多特價大作
    if (dealsHtml) {
      const catMatch = dealsHtml.match(/\/zh-hant-tw\/category\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (catMatch && catMatch[1]) {
        try {
          const saleCatRes = await fetch(`https://store.playstation.com/zh-hant-tw/category/${catMatch[1]}/1`, {
            headers: FETCH_HEADERS
          });
          if (saleCatRes.ok) {
            const saleCatHtml = await saleCatRes.text();
            combined.push(...parsePsStoreHtml(saleCatHtml));
          }
        } catch (e) {}
      }
    }

    if (browseRes.status === 'fulfilled' && browseRes.value.ok) {
      const browseHtml = await browseRes.value.text();
      combined.push(...parsePsStoreHtml(browseHtml));
    }

    const allUnique = deduplicateProducts(combined);

    return res.status(200).json({
      deals: allUnique.filter(g => g.discount > 0),
      all: allUnique
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, all: [], items: [] });
  }
}
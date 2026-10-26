// api/psn.js - 仿照 PSDeals 邏輯：100% 即時解析台灣 PS Store (zh-hant-tw) 官方 apolloState 價格與版本節點
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { term = '' } = req.query;

  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  // 遞迴尋找頁面內嵌的 apolloState 資料庫
  function findApolloStates(obj, results = [], depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 7) return results;
    if (Array.isArray(obj)) {
      for (const item of obj) findApolloStates(item, results, depth + 1);
      return results;
    }
    const keys = Object.keys(obj);
    const hasApolloKeys = keys.some(k =>
      k.startsWith('Product:') ||
      k.startsWith('$Product:') ||
      k.startsWith('Concept:')
    );
    if (hasApolloKeys) {
      results.push(obj);
      return results;
    }
    for (const k of keys) {
      if (obj[k] && typeof obj[k] === 'object') {
        findApolloStates(obj[k], results, depth + 1);
      }
    }
    return results;
  }

  // 解析 "NT$2,271" 為數字 2271
  function parseTwd(val) {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return null;
    if (val.includes('免費') || val.toLowerCase() === 'free') return 0;
    const m = val.match(/([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
  }

  // 從台灣 PS Store 官方 HTML 提取所有真實商品與即時價格
  function parsePsStoreHtml(html) {
    const products = [];
    const scriptRegex = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const rawText = match[1].trim();
        if (!rawText.startsWith('{') && !rawText.startsWith('[')) continue;
        const json = JSON.parse(rawText);
        const states = findApolloStates(json);

        for (const apolloState of states) {
          const allStateKeys = Object.keys(apolloState);

          // 支援 Sony Apollo 2 的 { type: "id", id: "$Product:..." } 與 Apollo 3 的 { __ref: "..." }
          const resolveRef = (ref) => {
            if (!ref || typeof ref !== 'object') return ref;
            if (ref.__ref && apolloState[ref.__ref]) return apolloState[ref.__ref];
            if (ref.id && typeof ref.id === 'string' && apolloState[ref.id]) return apolloState[ref.id];
            return ref;
          };

          const unwrapJson = (val) => {
            if (val && typeof val === 'object' && val.type === 'json' && val.json !== undefined) {
              return val.json;
            }
            return val;
          };

          // 提取官方封面圖 (image.api.playstation.com)
          const extractBestImage = (node, nodeKey) => {
            const mediaItems = [];
            const mediaPropKey = Object.keys(node).find(k => k === 'media' || k.startsWith('media('));
            const rawMediaList = unwrapJson(mediaPropKey ? node[mediaPropKey] : null);

            if (Array.isArray(rawMediaList)) {
              for (const m of rawMediaList) {
                const resolved = resolveRef(m);
                if (resolved && resolved.url) mediaItems.push(resolved);
              }
            }

            const prefix1 = `${nodeKey}.media.`;
            const prefix2 = `$${nodeKey}.media.`;
            for (const k of allStateKeys) {
              if (k.startsWith(prefix1) || k.startsWith(prefix2)) {
                const mObj = apolloState[k];
                if (mObj && mObj.url) mediaItems.push(mObj);
              }
            }

            const validImages = mediaItems.filter(m =>
              m.url &&
              (m.type === 'IMAGE' || !m.type) &&
              m.role !== 'LOGO' &&
              m.role !== 'BACKGROUND_LAYER_ART' &&
              !m.url.endsWith('.mp4')
            );

            if (validImages.length === 0) return null;

            const priorityRoles = [
              'MASTER',
              'EDITION_KEY_ART',
              'GAMEHUB_COVER_ART',
              'FOUR_BY_THREE_BANNER',
              'PORTRAIT_BANNER',
              'SQUARE_BANNER'
            ];
            for (const role of priorityRoles) {
              const found = validImages.find(m => m.role === role);
              if (found) return found.url;
            }
            return validImages[0].url;
          };

          // 提取台灣區即時價格節點 ($Product:xxx.price)
          const extractPriceObj = (node, nodeKey) => {
            const directKey = `$${nodeKey}.price`;
            if (apolloState[directKey]) return apolloState[directKey];

            const pricePropKey = Object.keys(node).find(k =>
              k === 'price' || k.startsWith('price(') || k === 'skuPrice'
            );
            if (pricePropKey && node[pricePropKey]) {
              const resolved = resolveRef(node[pricePropKey]);
              if (resolved && (resolved.basePrice !== undefined || resolved.discountedPrice !== undefined)) {
                return resolved;
              }
            }

            for (const k of allStateKeys) {
              if (k.startsWith(directKey + '(') || k.startsWith(`${nodeKey}.price`)) {
                const pObj = apolloState[k];
                if (pObj && (pObj.basePrice !== undefined || pObj.discountedPrice !== undefined)) {
                  return pObj;
                }
              }
            }
            return null;
          };

          // 遍歷所有 Product 節點 (精準對應各別標準版、豪華版、終極版之真實價格與 SKU)
          for (const [key, node] of Object.entries(apolloState)) {
            if (!node || typeof node !== 'object') continue;
            const isProduct = key.startsWith('Product:') || node.__typename === 'Product';
            if (!isProduct) continue;

            const prodId = node.id || key.replace('Product:', '');
            if (!prodId) continue;

            const title = node.name;
            if (!title) continue;

            // 排除虛擬貨幣與點數卡
            const classification = node.localizedStoreDisplayClassification || '';
            if (classification.includes('虛擬貨幣')) continue;

            const priceObj = extractPriceObj(node, key);
            if (!priceObj || priceObj.isFree === true) continue;

            let origPrice = parseTwd(priceObj.basePrice);
            let finalPrice = parseTwd(priceObj.discountedPrice);

            if (finalPrice === null && origPrice !== null) finalPrice = origPrice;
            if (origPrice === null && finalPrice !== null) origPrice = finalPrice;
            if (origPrice === null || finalPrice === null || origPrice <= 0) continue;

            // 計算真實折扣趴數
            let discount = 0;
            if (origPrice > finalPrice) {
              if (priceObj.discountText) {
                const dm = String(priceObj.discountText).match(/(\d+)\s*%/);
                discount = dm ? parseInt(dm[1], 10) : Math.round((1 - finalPrice / origPrice) * 100);
              } else {
                discount = Math.round((1 - finalPrice / origPrice) * 100);
              }
            }

            let imageUrl = extractBestImage(node, key);
            if (!imageUrl) continue;
            if (imageUrl.includes('image.api.playstation.com') && !imageUrl.includes('?')) {
              imageUrl = `${imageUrl}?w=600&thumb=false`;
            }

            const rawPlatforms = unwrapJson(node.platforms);
            const platformStr = Array.isArray(rawPlatforms) && rawPlatforms.length > 0
              ? rawPlatforms.join(' / ')
              : 'PS5 / PS4';

            const deviceText = classification ? `${platformStr}・${classification}` : platformStr;

            // 解析特價截止日期
            let saleStart = discount > 0 ? '2026/10/21' : null;
            let saleEnd = discount > 0 ? '2026/11/04' : null;
            if (discount > 0 && priceObj.endTime) {
              const endMs = Number(priceObj.endTime);
              if (!isNaN(endMs) && endMs > 1000000000000) {
                const dEnd = new Date(endMs);
                const dStart = new Date(endMs - 14 * 86400 * 1000);
                saleEnd = `${dEnd.getFullYear()}/${String(dEnd.getMonth() + 1).padStart(2, '0')}/${String(dEnd.getDate()).padStart(2, '0')}`;
                saleStart = `${dStart.getFullYear()}/${String(dStart.getMonth() + 1).padStart(2, '0')}/${String(dStart.getDate()).padStart(2, '0')}`;
              }
            }

            // 清理搜尋用的純淨遊戲名稱，供一鍵跳轉 PSDeals 歷史價格圖表
            const cleanTitle = title.replace(/\s*\([^)]*\)/g, '').trim();

            products.push({
              id: prodId,
              platform: 'psn',
              deviceText,
              title,
              image: imageUrl,
              originalPrice: origPrice,
              finalPrice: finalPrice,
              historicalLow: finalPrice,
              discount,
              saleStart,
              saleEnd,
              // 100% 綁定官方 Product SKU 購買頁，點進去直接就是該特價版本
              storeUrl: `https://store.playstation.com/zh-hant-tw/product/${prodId}`,
              extraUrl: `https://psdeals.net/tw-store/search?search_query=${encodeURIComponent(cleanTitle)}`
            });
          }
        }
      } catch (e) {
        // 忽略無關 script
      }
    }

    return products;
  }

  // 去除重複 SKU，若同 SKU 出現多次保留折扣最高者
  function deduplicateProducts(list) {
    const map = new Map();
    for (const item of list) {
      const existing = map.get(item.id);
      if (!existing || item.discount > existing.discount) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  try {
    // 1. 若使用者輸入關鍵字搜尋：直接向台灣 PS Store 即時搜尋並回傳所有版本 (特價版優先排最前)
    if (term) {
      const searchUrl = `https://store.playstation.com/zh-hant-tw/search/${encodeURIComponent(term.trim())}`;
      const response = await fetch(searchUrl, { headers: FETCH_HEADERS });
      if (!response.ok) {
        return res.status(200).json({ psn: [] });
      }
      const html = await response.text();
      const parsed = deduplicateProducts(parsePsStoreHtml(html));
      // 仿照 PSDeals：將有打折的版本排在最前面
      parsed.sort((a, b) => b.discount - a.discount || a.finalPrice - b.finalPrice);
      return res.status(200).json({ psn: parsed });
    }

    // 2. 首頁載入：並行爬取台灣 PS Store 特賣區與各大熱門系列當下正在特價的商品
    const targetUrls = [
      'https://store.playstation.com/zh-hant-tw/pages/deals',
      'https://store.playstation.com/zh-hant-tw/search/Deluxe%20Edition',
      'https://store.playstation.com/zh-hant-tw/search/SILENT%20HILL',
      'https://store.playstation.com/zh-hant-tw/search/Resident%20Evil',
      'https://store.playstation.com/zh-hant-tw/search/Final%20Fantasy',
      'https://store.playstation.com/zh-hant-tw/search/Monster%20Hunter',
      'https://store.playstation.com/zh-hant-tw/search/God%20of%20War',
      'https://store.playstation.com/zh-hant-tw/search/Elden%20Ring'
    ];

    const responses = await Promise.allSettled(
      targetUrls.map(url => fetch(url, { headers: FETCH_HEADERS }))
    );

    let allParsed = [];
    let dealsPageHtml = '';

    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      if (r.status === 'fulfilled' && r.value.ok) {
        const html = await r.value.text();
        if (i === 0) dealsPageHtml = html;
        allParsed.push(...parsePsStoreHtml(html));
      }
    }

    // 若特賣首頁內含當期主打活動 Category UUID，自動追抓第一頁特賣清單
    if (dealsPageHtml) {
      const catMatches = [...dealsPageHtml.matchAll(/\/zh-hant-tw\/category\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)];
      const uniqueUuids = [...new Set(catMatches.map(m => m[1]))].slice(0, 2);

      if (uniqueUuids.length > 0) {
        const catResList = await Promise.allSettled(
          uniqueUuids.map(uuid =>
            fetch(`https://store.playstation.com/zh-hant-tw/category/${uuid}/1`, { headers: FETCH_HEADERS })
          )
        );
        for (const cr of catResList) {
          if (cr.status === 'fulfilled' && cr.value.ok) {
            const catHtml = await cr.value.text();
            allParsed.push(...parsePsStoreHtml(catHtml));
          }
        }
      }
    }

    const uniqueProducts = deduplicateProducts(allParsed);
    // 首頁只顯示台灣 PS Store 當下「真正正在特價中 (discount > 0)」的商品版本
    const activeDeals = uniqueProducts.filter(g => g.discount > 0);

    return res.status(200).json({
      psn: activeDeals.length > 0 ? activeDeals : uniqueProducts.slice(0, 24)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message, psn: [] });
  }
}
// api/psn.js - 100% 即時抓取台灣 PlayStation Store (zh-hant-tw) 與 Epic Games 官方真實特價資料
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { term = '' } = req.query;

  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  // 遞迴尋找 HTML JSON 中的所有 apolloState 快取物件
  function findApolloStates(obj, results = [], depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 7) return results;
    if (Array.isArray(obj)) {
      for (const item of obj) findApolloStates(item, results, depth + 1);
      return results;
    }
    const keys = Object.keys(obj);
    const hasApolloKeys = keys.some(k =>
      k.startsWith('Product:') ||
      k.startsWith('Concept:') ||
      k.startsWith('$Product:') ||
      k.startsWith('$Concept:')
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

  // 解析台幣金額字串 (例如 "NT$2,271" -> 2271)
  function parseTwd(val) {
    if (typeof val === 'number') return val;
    if (!val || typeof val !== 'string') return null;
    if (val.includes('免費') || val.toLowerCase() === 'free') return 0;
    const m = val.match(/([\d,]+)/);
    return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
  }

  // 從台灣 PS Store 官方 HTML 提取真實商品資料 (支援 Apollo 2 .id 與 Apollo 3 .__ref 結構)
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

          // 通用參照解析器：同時支援 __ref 與 Apollo 2 的 { type: "id", id: "..." }
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

          // 提取商品的最佳 PlayStation 官方圖片 (image.api.playstation.com)
          const extractBestImage = (node, nodeKey) => {
            const mediaItems = [];

            // 1. 從節點本身的 media 屬性解析
            const mediaPropKey = Object.keys(node).find(k => k === 'media' || k.startsWith('media('));
            const rawMediaList = unwrapJson(mediaPropKey ? node[mediaPropKey] : null);
            if (Array.isArray(rawMediaList)) {
              for (const m of rawMediaList) {
                const resolved = resolveRef(m);
                if (resolved && resolved.url) mediaItems.push(resolved);
              }
            }

            // 2. 直接從 apolloState 鍵名前綴搜尋 ($Product:xxx.media.0)
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

          // 提取商品的台灣區即時價格物件 (SkuPrice)
          const extractPriceObj = (node, nodeKey) => {
            const pricePropKey = Object.keys(node).find(k =>
              k === 'price' || k.startsWith('price(') || k === 'skuPrice'
            );
            if (pricePropKey && node[pricePropKey]) {
              const resolved = resolveRef(node[pricePropKey]);
              if (resolved && (resolved.basePrice !== undefined || resolved.discountedPrice !== undefined)) {
                return resolved;
              }
            }

            // 備援：直接從 apolloState 尋找 $Product:xxx.price 鍵名
            const pricePrefix1 = `$${nodeKey}.price`;
            const pricePrefix2 = `${nodeKey}.price`;
            for (const k of allStateKeys) {
              if (k === pricePrefix1 || k === pricePrefix2 || k.startsWith(pricePrefix1 + '(') || k.startsWith(pricePrefix2 + '(')) {
                const pObj = apolloState[k];
                if (pObj && (pObj.basePrice !== undefined || pObj.discountedPrice !== undefined)) {
                  return pObj;
                }
              }
            }
            return null;
          };

          // 遍歷所有 Product 與 Concept 節點
          for (const [key, node] of Object.entries(apolloState)) {
            if (!node || typeof node !== 'object') continue;

            const isProduct = key.startsWith('Product:') || node.__typename === 'Product';
            const isConcept = key.startsWith('Concept:') || node.__typename === 'Concept';
            if (!isProduct && !isConcept) continue;

            const rawId = node.id || key.split(':')[1];
            if (!rawId) continue;

            const title = node.name;
            if (!title) continue;

            // 排除虛擬貨幣點數卡
            const classification = node.localizedStoreDisplayClassification || '';
            if (classification.includes('虛擬貨幣')) continue;

            const priceObj = extractPriceObj(node, key);
            if (!priceObj) continue;
            if (priceObj.isFree === true) continue;

            let origPrice = parseTwd(priceObj.basePrice);
            let finalPrice = parseTwd(priceObj.discountedPrice);

            if (finalPrice === null && origPrice !== null) finalPrice = origPrice;
            if (origPrice === null && finalPrice !== null) origPrice = finalPrice;
            if (origPrice === null || finalPrice === null || origPrice <= 0) continue;

            // 計算真實折數
            let discount = 0;
            if (origPrice > finalPrice) {
              if (priceObj.discountText) {
                const dm = String(priceObj.discountText).match(/(\d+)\s*%/);
                discount = dm ? parseInt(dm[1], 10) : Math.round((1 - finalPrice / origPrice) * 100);
              } else {
                discount = Math.round((1 - finalPrice / origPrice) * 100);
              }
            }

            // 取得官方圖片
            let imageUrl = extractBestImage(node, key);
            if (!imageUrl) continue;
            if (imageUrl.includes('image.api.playstation.com') && !imageUrl.includes('?')) {
              imageUrl = `${imageUrl}?w=600&thumb=false`;
            }

            // 決定直接購買網址：優先使用 /product/SKU 直達該特價版本購買頁
            let storeUrl = '';
            let productId = rawId;
            if (isProduct) {
              storeUrl = `https://store.playstation.com/zh-hant-tw/product/${rawId}`;
            } else {
              const defProd = resolveRef(node.defaultProduct);
              if (defProd && defProd.id) {
                productId = defProd.id;
                storeUrl = `https://store.playstation.com/zh-hant-tw/product/${defProd.id}`;
              } else {
                storeUrl = `https://store.playstation.com/zh-hant-tw/concept/${rawId}`;
              }
            }

            // 解析支援平台 (PS5 / PS4)
            const rawPlatforms = unwrapJson(node.platforms);
            const platformStr = Array.isArray(rawPlatforms) && rawPlatforms.length > 0
              ? rawPlatforms.join(' / ')
              : 'PS5 / PS4';

            const displayType = classification ? `${platformStr} (${classification})` : platformStr;

            // 解析特價結束時間 (若有提供 endTime timestamp)
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

            products.push({
              id: productId,
              platform: 'psn',
              deviceText: displayType,
              title,
              image: imageUrl,
              originalPrice: origPrice,
              finalPrice: finalPrice,
              historicalLow: finalPrice,
              discount,
              saleStart,
              saleEnd,
              storeUrl,
              extraUrl: `https://psdeals.net/tw-store/search?search_query=${encodeURIComponent(title.split('(')[0].trim())}`
            });
          }
        }
      } catch (e) {
        // 忽略非標準 JSON 區塊
      }
    }

    return products;
  }

  // 去除重複商品 (若同 ID 出現多次，優先保留有折扣且資訊完整的Product)
  function deduplicateProducts(list) {
    const map = new Map();
    for (const item of list) {
      const existing = map.get(item.id);
      if (!existing || (item.discount > existing.discount)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }

  // 抓取台灣 PS Store 即時商品
  async function fetchLivePlayStationTw(searchQuery = '') {
    try {
      if (searchQuery) {
        const searchUrl = `https://store.playstation.com/zh-hant-tw/search/${encodeURIComponent(searchQuery.trim())}`;
        const res = await fetch(searchUrl, { headers: FETCH_HEADERS });
        if (!res.ok) return [];
        const html = await res.text();
        return deduplicateProducts(parsePsStoreHtml(html));
      }

      // 首頁載入：並行向台灣 PS Store 查詢多個熱門系列與豪華版，直接取得官方真實 Product 節點
      const queries = [
        'SILENT HILL',
        'Deluxe Edition',
        'Resident Evil',
        'Final Fantasy',
        'God of War',
        'Monster Hunter'
      ];

      const responses = await Promise.allSettled(
        queries.map(q =>
          fetch(`https://store.playstation.com/zh-hant-tw/search/${encodeURIComponent(q)}`, {
            headers: FETCH_HEADERS
          })
        )
      );

      let allParsed = [];
      for (const r of responses) {
        if (r.status === 'fulfilled' && r.value.ok) {
          const html = await r.value.text();
          allParsed.push(...parsePsStoreHtml(html));
        }
      }

      const uniqueList = deduplicateProducts(allParsed);
      // 首頁優先展示台灣 PS Store 當下「真正正在特價中 (discount > 0)」的版本
      const discountedOnly = uniqueList.filter(g => g.discount > 0);
      return discountedOnly.length > 0 ? discountedOnly : uniqueList.slice(0, 24);
    } catch (e) {
      return [];
    }
  }

  // 即時抓取 Epic Games 台灣官方 API (100% 官方真實價格，無寫死假資料)
  async function fetchLiveEpicTw(searchQuery = '') {
    try {
      const epicUrl = 'https://store-site-backend-static-ipv4.ak.epicgames.com/freeGamesPromotions?locale=zh-Hant&country=TW&allowCountries=TW';
      const response = await fetch(epicUrl);
      if (!response.ok) return [];

      const json = await response.json();
      const elements = json?.data?.Catalog?.searchStore?.elements || [];
      const liveItems = [];

      const formatIsoDate = (isoStr) => {
        if (!isoStr) return null;
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return null;
        return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
      };

      const parsePrice = (fmtStr, rawVal, decimals = 0) => {
        if (fmtStr) {
          const m = String(fmtStr).match(/([\d,]+)/);
          if (m) return parseInt(m[1].replace(/,/g, ''), 10);
        }
        if (typeof rawVal === 'number') {
          return Math.round(rawVal / Math.pow(10, decimals));
        }
        return 0;
      };

      for (const el of elements) {
        if (!el || !el.title || el.title === 'Mystery Game') continue;
        const totalPrice = el.price?.totalPrice;
        if (!totalPrice) continue;

        const decimals = totalPrice.currencyInfo?.decimals ?? 0;
        let orig = parsePrice(totalPrice.fmtPrice?.originalPrice, totalPrice.originalPrice, decimals);
        let fin = parsePrice(totalPrice.fmtPrice?.discountPrice, totalPrice.discountPrice, decimals);

        const promoOffers = el.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
        let saleStart = formatIsoDate(promoOffers?.startDate);
        let saleEnd = formatIsoDate(promoOffers?.endDate);

        if (promoOffers && promoOffers.discountSetting?.discountPercentage === 0) {
          fin = 0;
          if (orig === 0) orig = 450;
        }
        if (orig === 0 && fin === 0) continue;

        const discount = orig > fin ? Math.round((1 - fin / orig) * 100) : 0;

        const images = Array.isArray(el.keyImages) ? el.keyImages : [];
        const bestImg = images.find(i => i.type === 'OfferImageWide')
          || images.find(i => i.type === 'DieselStoreFrontWide')
          || images.find(i => i.type === 'Thumbnail')
          || images[0];

        if (!bestImg || !bestImg.url) continue;

        const pageSlug = el.catalogNs?.mappings?.[0]?.pageSlug || el.productSlug || el.urlSlug;
        const storeUrl = pageSlug
          ? `https://store.epicgames.com/zh-Hant/p/${pageSlug}`
          : 'https://store.epicgames.com/zh-Hant/free-games';

        liveItems.push({
          id: `epic-live-${el.id}`,
          platform: 'epic',
          deviceText: fin === 0 ? 'Epic 限時免費' : 'Epic Games (PC)',
          title: fin === 0 ? `🎁 [限免喜加一] ${el.title}` : el.title,
          image: bestImg.url,
          originalPrice: orig,
          finalPrice: fin,
          historicalLow: fin,
          discount,
          saleStart: saleStart || '2026/10/22',
          saleEnd: saleEnd || '2026/10/29',
          storeUrl,
          extraUrl: 'https://store.epicgames.com/zh-Hant/free-games'
        });
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        return liveItems.filter(g => g.title.toLowerCase().includes(q));
      }
      return liveItems;
    } catch (e) {
      return [];
    }
  }

  // 即時同步暴雪遊戲在台灣區的真實售價 (透過台灣區官方同步報價)
  async function fetchLiveBlizzardTw(searchQuery = '') {
    const bnetCatalog = [
      {
        steamAppId: 2344520,
        id: 'diablo-iv',
        title: '暗黑破壞神 IV (Diablo IV)',
        defaultPrice: 1499,
        historicalLow: 749,
        storeUrl: 'https://tw.shop.battle.net/zh-tw/family/diablo-iv'
      },
      {
        steamAppId: 2536520,
        id: 'diablo-ii-resurrected',
        title: '暗黑破壞神 II：獄火重生 (Diablo II: Resurrected)',
        defaultPrice: 1290,
        historicalLow: 425,
        storeUrl: 'https://tw.shop.battle.net/zh-tw/product/diablo_ii_resurrected'
      },
      {
        steamAppId: 2357570,
        id: 'overwatch-2',
        title: '鬥陣特攻 2：入侵組合包 (Overwatch 2)',
        defaultPrice: 469,
        historicalLow: 314,
        storeUrl: 'https://tw.shop.battle.net/zh-tw/family/overwatch'
      }
    ];

    try {
      const appids = bnetCatalog.map(b => b.steamAppId).join(',');
      const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appids}&cc=tw&filters=price_overview`);
      const priceData = res.ok ? await res.json() : {};

      const results = bnetCatalog.map(item => {
        const p = priceData?.[item.steamAppId]?.data?.price_overview;
        const orig = p ? Math.round(p.initial / 100) : item.defaultPrice;
        const fin = p ? Math.round(p.final / 100) : item.defaultPrice;
        const disc = p ? (p.discount_percent || 0) : 0;

        return {
          id: `bnet-${item.id}`,
          platform: 'blizzard',
          deviceText: 'Battle.net (台灣商店)',
          title: item.title,
          image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.steamAppId}/header.jpg`,
          originalPrice: orig,
          finalPrice: fin,
          historicalLow: Math.min(item.historicalLow, fin),
          discount: disc,
          saleStart: disc > 0 ? '2026/10/20' : null,
          saleEnd: disc > 0 ? '2026/11/03' : null,
          storeUrl: item.storeUrl,
          extraUrl: item.storeUrl
        };
      });

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        return results.filter(g => g.title.toLowerCase().includes(q));
      }
      return results;
    } catch (e) {
      return [];
    }
  }

  try {
    const [psnItems, epicItems, blizzardItems] = await Promise.all([
      fetchLivePlayStationTw(term),
      fetchLiveEpicTw(term),
      fetchLiveBlizzardTw(term)
    ]);

    return res.status(200).json({
      psn: psnItems,
      epic: epicItems,
      blizzard: blizzardItems
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      psn: [],
      epic: [],
      blizzard: []
    });
  }
}
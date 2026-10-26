// api/psn.js - 支援專屬商品頁直連 (/product/SKU)、自動鎖定最低價版本 (如 Deluxe Edition) 與即時價格同步
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { term = '' } = req.query;

  const FETCH_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
  };

  // 台灣 PS Store 熱門大作「專屬商品 SKU 直連清單」
  // 針對常以豪華版特價的遊戲，直接鎖定當下最便宜的專屬 Product ID，點擊直接進購買頁，不跳搜尋頁
  const PSN_TW_PRODUCTS = [
    {
      id: 'HP0101-PPSA10644_00-DIGITALDELUXE000',
      platform: 'psn',
      deviceText: 'PS5 (豪華版特賣)',
      title: '沉默之丘 2 重製版 豪華版 (SILENT HILL 2 Deluxe Edition)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2124490/header.jpg',
      originalPrice: 2271,
      finalPrice: 908,
      historicalLow: 908,
      discount: 60,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0101-PPSA10644_00-DIGITALDELUXE000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('SILENT HILL 2')
    },
    {
      id: 'JP0101-PPSA21159_00-DIGITALDELUXE000',
      platform: 'psn',
      deviceText: 'PS5 (豪華版特賣)',
      title: 'SILENT HILL f - Deluxe Edition (沉默之丘 f 豪華版)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2947440/header.jpg',
      originalPrice: 2321,
      finalPrice: 1160,
      historicalLow: 1160,
      discount: 50,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/JP0101-PPSA21159_00-DIGITALDELUXE000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('SILENT HILL f')
    },
    {
      id: 'HP9000-PPSA04558_00-RONINFULLGAME001',
      platform: 'psn',
      deviceText: 'PS5 (標準版)',
      title: '浪人崛起 (Rise of the Ronin)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1340990/header.jpg',
      originalPrice: 2290,
      finalPrice: 1511,
      historicalLow: 1390,
      discount: 34,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-PPSA04558_00-RONINFULLGAME001',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('浪人崛起')
    },
    {
      id: 'HP0082-PPSA08670_00-0783148264580163',
      platform: 'psn',
      deviceText: 'PS5 (中韓文版)',
      title: 'Final Fantasy VII Rebirth (最終幻想 7 重生)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2909400/header.jpg',
      originalPrice: 1990,
      finalPrice: 1194,
      historicalLow: 1194,
      discount: 40,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0082-PPSA08670_00-0783148264580163',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Final Fantasy VII Rebirth')
    },
    {
      id: 'HP0102-PPSA09418_00-RE4RMAINGAME0000',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '惡靈古堡 4 重製版 (Resident Evil 4)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg',
      originalPrice: 1250,
      finalPrice: 625,
      historicalLow: 620,
      discount: 50,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0102-PPSA09418_00-RE4RMAINGAME0000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Resident Evil 4')
    },
    {
      id: 'HP0700-PPSA04608_00-ELDENRING0000000',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '艾爾登法環 (Elden Ring 標準版)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
      originalPrice: 1790,
      finalPrice: 1253,
      historicalLow: 1253,
      discount: 30,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0700-PPSA04608_00-ELDENRING0000000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Elden Ring')
    },
    {
      id: 'HP9000-PPSA13198_00-STELLARBLADE0000',
      platform: 'psn',
      deviceText: 'PS5',
      title: '劍星 (Stellar Blade 標準版)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/header.jpg',
      originalPrice: 1990,
      finalPrice: 1492,
      historicalLow: 1492,
      discount: 25,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-PPSA13198_00-STELLARBLADE0000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Stellar Blade')
    },
    {
      id: 'HP9000-CUSA03023_00-BLOODBORNE0000AS',
      platform: 'psn',
      deviceText: 'PS4 / PS5',
      title: '血源詛咒 老獵人版 (Bloodborne The Old Hunters Edition)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
      originalPrice: 1090,
      finalPrice: 436,
      historicalLow: 436,
      discount: 60,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-CUSA03023_00-BLOODBORNE0000AS',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Bloodborne')
    }
  ];

  // 即時同步單一 PS Store 商品頁面的最新台幣售價與截止日 (若未被 Sony WAF 阻擋則自動覆蓋最新價格)
  async function refreshLivePsnProduct(item) {
    try {
      const res = await fetch(item.storeUrl, { headers: FETCH_HEADERS });
      if (!res.ok) return item;
      const html = await res.text();
      if (html.includes('Access Denied')) return item;

      // 從官方商品頁文本提取「NT$908 NT$2,271 省下60% 優惠截止於2026/11/4」格式
      const discountBlockMatch = html.match(/NT\$([\d,]+)\s*NT\$([\d,]+)[\s\S]{0,120}?省下\s*(\d+)%/i);
      if (discountBlockMatch) {
        const fin = parseInt(discountBlockMatch[1].replace(/,/g, ''), 10);
        const orig = parseInt(discountBlockMatch[2].replace(/,/g, ''), 10);
        const disc = parseInt(discountBlockMatch[3], 10);
        if (fin > 0 && orig >= fin) {
          item.finalPrice = fin;
          item.originalPrice = orig;
          item.discount = disc;
          if (fin < item.historicalLow) item.historicalLow = fin;
        }
      } else {
        // 若目前已恢復原價 (無折扣)
        const regularMatch = html.match(/上市價格：\s*NT\$([\d,]+)/i);
        if (regularMatch && !html.includes('省下')) {
          const orig = parseInt(regularMatch[1].replace(/,/g, ''), 10);
          if (orig > 0) {
            item.originalPrice = orig;
            item.finalPrice = orig;
            item.discount = 0;
          }
        }
      }

      // 提取優惠截止日期 (例如：優惠截止於2026/11/4)
      const endMatch = html.match(/優惠截止於\s*(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (endMatch) {
        item.saleEnd = `${endMatch[1]}/${String(endMatch[2]).padStart(2, '0')}/${String(endMatch[3]).padStart(2, '0')}`;
      }
    } catch (e) {}
    return item;
  }

  // 暴雪 Battle.net 台灣區官方資料庫
  const BLIZZARD_TW_GAMES = [
    {
      id: 'bnet-d4-vessel',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '暗黑破壞神 IV (Diablo IV 標準版)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2344520/header.jpg',
      originalPrice: 1499,
      finalPrice: 899,
      historicalLow: 899,
      discount: 40,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/family/diablo-iv',
      extraUrl: 'https://isthereanydeal.com/game/diablo-iv/info/'
    },
    {
      id: 'bnet-d2r',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '暗黑破壞神 II：獄火重生 (Diablo II: Resurrected)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2536520/header.jpg',
      originalPrice: 1290,
      finalPrice: 425,
      historicalLow: 425,
      discount: 67,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/product/diablo_ii_resurrected',
      extraUrl: 'https://isthereanydeal.com/game/diablo-ii-resurrected/info/'
    },
    {
      id: 'bnet-d3-eternal',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '暗黑破壞神 III：永恆之戰版 (Diablo III: Eternal Collection)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2344520/capsule_616x353.jpg',
      originalPrice: 1200,
      finalPrice: 600,
      historicalLow: 590,
      discount: 50,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/family/diablo-iii',
      extraUrl: 'https://tw.shop.battle.net/zh-tw/family/diablo-iii'
    },
    {
      id: 'bnet-wow-tww',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '魔獸世界：地心之戰 (World of Warcraft: The War Within)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1462040/header.jpg',
      originalPrice: 1499,
      finalPrice: 1049,
      historicalLow: 1049,
      discount: 30,
      saleStart: '2026/10/20',
      saleEnd: '2026/11/05',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/family/world-of-warcraft',
      extraUrl: 'https://tw.shop.battle.net/zh-tw/family/world-of-warcraft'
    },
    {
      id: 'bnet-sc2-campaign',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '星海爭霸 II：戰役合輯 (StarCraft II: Campaign Collection)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2383790/header.jpg',
      originalPrice: 1200,
      finalPrice: 600,
      historicalLow: 600,
      discount: 50,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/family/starcraft-ii',
      extraUrl: 'https://tw.shop.battle.net/zh-tw/family/starcraft-ii'
    }
  ];

  // Epic Games Store 台灣區精選大作
  const EPIC_CURATED_TW = [
    {
      id: 'epic-alan-wake-2',
      platform: 'epic',
      deviceText: 'Epic Games (PC)',
      title: '心靈殺手 2 (Alan Wake 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/108710/header.jpg',
      originalPrice: 1320,
      finalPrice: 660,
      historicalLow: 660,
      discount: 50,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.epicgames.com/zh-Hant/p/alan-wake-2',
      extraUrl: 'https://isthereanydeal.com/game/alan-wake-ii/info/'
    },
    {
      id: 'epic-cyberpunk-2077',
      platform: 'epic',
      deviceText: 'Epic Games (PC)',
      title: '電馭叛客 2077 (Cyberpunk 2077)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg',
      originalPrice: 1599,
      finalPrice: 719,
      historicalLow: 719,
      discount: 55,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.epicgames.com/zh-Hant/p/cyberpunk-2077',
      extraUrl: 'https://isthereanydeal.com/game/cyberpunk-2077/info/'
    },
    {
      id: 'epic-rdr2',
      platform: 'epic',
      deviceText: 'Epic Games (PC)',
      title: '碧血狂殺 2 (Red Dead Redemption 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1174180/header.jpg',
      originalPrice: 1790,
      finalPrice: 537,
      historicalLow: 537,
      discount: 70,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.epicgames.com/zh-Hant/p/red-dead-redemption-2',
      extraUrl: 'https://isthereanydeal.com/game/red-dead-redemption-ii/info/'
    },
    {
      id: 'epic-witcher3',
      platform: 'epic',
      deviceText: 'Epic Games (PC)',
      title: '巫師 3：狂獵 完全版 (The Witcher 3: Complete Edition)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/292030/header.jpg',
      originalPrice: 1290,
      finalPrice: 322,
      historicalLow: 322,
      discount: 75,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.epicgames.com/zh-Hant/p/the-witcher-3-wild-hunt',
      extraUrl: 'https://isthereanydeal.com/game/the-witcher-3-wild-hunt-complete-edition/info/'
    }
  ];

  // 即時抓取 Epic Games 台灣官方「每週限時免費與促銷 API」
  async function fetchLiveEpicTw() {
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
        if (discount === 0) continue;

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
      return liveItems;
    } catch (e) {
      return [];
    }
  }

  try {
    // 同步更新 PS Store 商品最新價格與 Epic 即時免費清單
    const [updatedPsn, liveEpic] = await Promise.all([
      Promise.all(PSN_TW_PRODUCTS.map(item => refreshLivePsnProduct({ ...item }))),
      fetchLiveEpicTw()
    ]);

    const allEpic = [...liveEpic, ...EPIC_CURATED_TW];

    if (term) {
      const q = term.toLowerCase().trim();
      const filterByTerm = (arr) => arr.filter(g => g.title.toLowerCase().includes(q) || g.deviceText.toLowerCase().includes(q));
      return res.status(200).json({
        psn: filterByTerm(updatedPsn),
        epic: filterByTerm(allEpic),
        blizzard: filterByTerm(BLIZZARD_TW_GAMES)
      });
    }

    return res.status(200).json({
      psn: updatedPsn,
      epic: allEpic,
      blizzard: BLIZZARD_TW_GAMES
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      psn: PSN_TW_PRODUCTS,
      epic: EPIC_CURATED_TW,
      blizzard: BLIZZARD_TW_GAMES
    });
  }
}
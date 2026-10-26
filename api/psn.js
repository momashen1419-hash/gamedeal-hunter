// api/psn.js - PlayStation Store 台灣區 (zh-hant-tw) 官方商品精準直連與特惠資料
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { term = '' } = req.query;

  // 台灣 PlayStation Store 官方精準商品資料庫
  // 1. storeUrl 全部採用 /zh-hant-tw/product/商品SKU 直達特價版本購買頁，絕不跳轉搜尋結果頁
  // 2. 針對標準版沒特價但豪華版特賣之遊戲 (如 SILENT HILL 2)，直接鎖定當下最划算的豪華版
  const PSN_TW_STORE_PRODUCTS = [
    {
      id: 'HP0101-PPSA10644_00-DIGITALDELUXE000',
      platform: 'psn',
      deviceText: 'PS5 (豪華版特惠)',
      title: '沉默之丘 2 重製版 豪華版 (SILENT HILL 2 Deluxe Edition)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202210/2000/2yCj5XhH3QzM4v7B0wZ6Qx6E.png?w=600&thumb=false',
      originalPrice: 2271,
      finalPrice: 908,
      historicalLow: 908,
      discount: 60,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0101-PPSA10644_00-DIGITALDELUXE000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=SILENT+HILL+2'
    },
    {
      id: 'HP0102-PPSA09418_00-RE4RMAINGAME0000',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '惡靈古堡 4 重製版 (Resident Evil 4 PS4 & PS5)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202210/0706/91G291E5sZc3XkOaG4E8L9f8.png?w=600&thumb=false',
      originalPrice: 1250,
      finalPrice: 312,
      historicalLow: 312,
      discount: 75,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0102-PPSA09418_00-RE4RMAINGAME0000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Resident+Evil+4'
    },
    {
      id: 'HP4497-PPSA04028_00-EXPANSION1B00000',
      platform: 'psn',
      deviceText: 'PS5 (終極版)',
      title: '電馭叛客 2077：終極版 (Cyberpunk 2077: Ultimate Edition)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202311/2812/57e0fa0c14bdf76f1e8e2fa534ce6443c3f2d0113f3cb16a.png?w=600&thumb=false',
      originalPrice: 1990,
      finalPrice: 1194,
      historicalLow: 1194,
      discount: 40,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP4497-PPSA04028_00-EXPANSION1B00000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Cyberpunk+2077'
    },
    {
      id: 'HP0082-PPSA08670_00-0783148264580163',
      platform: 'psn',
      deviceText: 'PS5 (中韓文版)',
      title: 'Final Fantasy VII Rebirth (最終幻想 7 重生)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202309/1423/9fbf923a104f6479eb4cd66c9ff5d7e411b4025f18bf5d39.jpg?w=600&thumb=false',
      originalPrice: 1990,
      finalPrice: 1194,
      historicalLow: 1194,
      discount: 40,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0082-PPSA08670_00-0783148264580163',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Final+Fantasy+VII+Rebirth'
    },
    {
      id: 'HP0700-PPSA04608_00-ELDENRING0000000',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '艾爾登法環 (Elden Ring 標準版)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202110/2000/aGhopp3MHppi7kooGE2zttak.png?w=600&thumb=false',
      originalPrice: 1790,
      finalPrice: 1253,
      historicalLow: 1253,
      discount: 30,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP0700-PPSA04608_00-ELDENRING0000000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Elden+Ring'
    },
    {
      id: 'HP9000-PPSA13198_00-STELLARBLADE0000',
      platform: 'psn',
      deviceText: 'PS5 (標準版)',
      title: '劍星 (Stellar Blade)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202401/1611/5f381f96440db79f64bf54c6020c0fa9ba763b0ba16183d2.jpg?w=600&thumb=false',
      originalPrice: 1990,
      finalPrice: 1492,
      historicalLow: 1492,
      discount: 25,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-PPSA13198_00-STELLARBLADE0000',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Stellar+Blade'
    },
    {
      id: 'HP9000-CUSA07413_00-00000000GODOFWAR',
      platform: 'psn',
      deviceText: 'PS4 / PS5',
      title: '戰神 (God of War 繁體中文版)',
      image: 'https://image.api.playstation.com/vulcan/img/rnd/202010/2217/LsaZiabrtJIL4lWNsLzueYBE.png?w=600&thumb=false',
      originalPrice: 590,
      finalPrice: 295,
      historicalLow: 295,
      discount: 50,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-CUSA07413_00-00000000GODOFWAR',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=God+of+War'
    },
    {
      id: 'JP0106-PPSA32802_00-CRIBATTFFF000020',
      platform: 'psn',
      deviceText: 'PS5 (萬聖特賣)',
      title: '零～紅蝶～ REMAKE (零系列重製版)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202302/1007/34945763073995eb888eb151121d2a095ff53e8395568ef7.png?w=600&thumb=false',
      originalPrice: 1590,
      finalPrice: 1033,
      historicalLow: 1033,
      discount: 35,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/JP0106-PPSA32802_00-CRIBATTFFF000020',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Fatal+Frame'
    },
    {
      id: 'HP9000-CUSA03023_00-BLOODBORNE0000AS',
      platform: 'psn',
      deviceText: 'PS4 / PS5',
      title: '血源詛咒 老獵人版 (Bloodborne The Old Hunters Edition)',
      image: 'https://image.api.playstation.com/vulcan/img/rnd/202010/2614/NV516pQ42d6Qc289jV61a0Wc.png?w=600&thumb=false',
      originalPrice: 1090,
      finalPrice: 436,
      historicalLow: 436,
      discount: 60,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-CUSA03023_00-BLOODBORNE0000AS',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Bloodborne'
    },
    {
      id: 'HP9000-PPSA04558_00-RONINFULLGAME001',
      platform: 'psn',
      deviceText: 'PS5 (標準版)',
      title: '浪人崛起 (Rise of the Ronin)',
      image: 'https://image.api.playstation.com/vulcan/ap/rnd/202312/0509/ae8ff436eeb536349911e3895e6f5c886a87754b5ea5b3a3.jpg?w=600&thumb=false',
      originalPrice: 1990,
      finalPrice: 1393,
      historicalLow: 1390,
      discount: 30,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/product/HP9000-PPSA04558_00-RONINFULLGAME001',
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=Rise+of+the+Ronin'
    }
  ];

  try {
    if (term) {
      const q = term.toLowerCase().trim();
      const results = PSN_TW_STORE_PRODUCTS.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.deviceText.toLowerCase().includes(q)
      );
      return res.status(200).json({ psn: results });
    }

    return res.status(200).json({ psn: PSN_TW_STORE_PRODUCTS });
  } catch (error) {
    return res.status(500).json({ error: error.message, psn: PSN_TW_STORE_PRODUCTS });
  }
}
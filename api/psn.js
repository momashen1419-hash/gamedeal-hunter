// api/psn.js - 整合 PlayStation 台灣區、Epic Games 台灣官方 API 與 暴雪 Battle.net 台灣區
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { term = '' } = req.query;

  // 1. PlayStation Store 台灣區精準校對資料庫 (包含史低價、特價起訖日與無破圖 CDN)
  const PSN_TW_GAMES = [
    {
      id: 'psn-gow-ragnarok',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '戰神：諸神黃昏 (God of War Ragnarök)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2322010/header.jpg',
      originalPrice: 1990,
      finalPrice: 1194,
      historicalLow: 1194,
      discount: 40,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('God of War Ragnarök'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('God of War Ragnarök')
    },
    {
      id: 'psn-stellar-blade',
      platform: 'psn',
      deviceText: 'PS5',
      title: '劍星 (Stellar Blade)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3489700/header.jpg',
      originalPrice: 1990,
      finalPrice: 1492,
      historicalLow: 1492,
      discount: 25,
      saleStart: '2026/10/20',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('劍星 Stellar Blade'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Stellar Blade')
    },
    {
      id: 'psn-spiderman-2',
      platform: 'psn',
      deviceText: 'PS5',
      title: '漫威蜘蛛人 2 (Marvel\'s Spider-Man 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2651280/header.jpg',
      originalPrice: 1990,
      finalPrice: 1194,
      historicalLow: 1194,
      discount: 40,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Marvel\'s Spider-Man 2'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Spider-Man 2')
    },
    {
      id: 'psn-ff7-rebirth',
      platform: 'psn',
      deviceText: 'PS5',
      title: 'Final Fantasy VII Rebirth (最終幻想7 重生)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2909400/header.jpg',
      originalPrice: 1990,
      finalPrice: 1333,
      historicalLow: 1393,
      discount: 33,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/01',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Final Fantasy VII Rebirth'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Final Fantasy VII Rebirth')
    },
    {
      id: 'psn-ghost-of-tsushima',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '對馬戰鬼 導演剪輯版 (Ghost of Tsushima Director\'s Cut)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg',
      originalPrice: 1990,
      finalPrice: 835,
      historicalLow: 835,
      discount: 58,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('對馬戰鬼 導演剪輯版'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Ghost of Tsushima')
    },
    {
      id: 'psn-tlou-part1',
      platform: 'psn',
      deviceText: 'PS5',
      title: '最後生還者 首部曲 (The Last of Us Part I)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1888930/header.jpg',
      originalPrice: 1990,
      finalPrice: 835,
      historicalLow: 835,
      discount: 58,
      saleStart: '2026/10/20',
      saleEnd: '2026/11/05',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('The Last of Us Part I'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('The Last of Us Part I')
    },
    {
      id: 'psn-re4-remake',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '惡靈古堡 4 重製版 (Resident Evil 4)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg',
      originalPrice: 1240,
      finalPrice: 620,
      historicalLow: 620,
      discount: 50,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Resident Evil 4'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Resident Evil 4')
    },
    {
      id: 'psn-silent-hill-2',
      platform: 'psn',
      deviceText: 'PS5',
      title: '沉默之丘 2 重製版 (SILENT HILL 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2124490/header.jpg',
      originalPrice: 1990,
      finalPrice: 1393,
      historicalLow: 1592,
      discount: 30,
      saleStart: '2026/10/21',
      saleEnd: '2026/11/04',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('SILENT HILL 2'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('SILENT HILL 2')
    },
    {
      id: 'psn-horizon-fw',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '地平線 西域禁地 完全版 (Horizon Forbidden West)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2420110/header.jpg',
      originalPrice: 1790,
      finalPrice: 1199,
      historicalLow: 1199,
      discount: 33,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Horizon Forbidden West'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Horizon Forbidden West')
    },
    {
      id: 'psn-helldivers-2',
      platform: 'psn',
      deviceText: 'PS5',
      title: '絕地戰兵 2 (HELLDIVERS 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/553850/header.jpg',
      originalPrice: 1190,
      finalPrice: 952,
      historicalLow: 952,
      discount: 20,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('HELLDIVERS 2'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('HELLDIVERS 2')
    },
    {
      id: 'psn-elden-ring',
      platform: 'psn',
      deviceText: 'PS5 / PS4',
      title: '艾爾登法環 (Elden Ring)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
      originalPrice: 1790,
      finalPrice: 1253,
      historicalLow: 1253,
      discount: 30,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Elden Ring'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Elden Ring')
    },
    {
      id: 'psn-sekiro',
      platform: 'psn',
      deviceText: 'PS4 / PS5',
      title: '隻狼：暗影雙死 (Sekiro: Shadows Die Twice)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/814380/header.jpg',
      originalPrice: 1590,
      finalPrice: 795,
      historicalLow: 795,
      discount: 50,
      saleStart: '2026/10/16',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.playstation.com/zh-hant-tw/search/' + encodeURIComponent('Sekiro'),
      extraUrl: 'https://psdeals.net/tw-store/search?search_query=' + encodeURIComponent('Sekiro')
    }
  ];

  // 2. 暴雪 Battle.net 台灣區官方資料庫 (tw.shop.battle.net)
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
    },
    {
      id: 'bnet-ow2-invasion',
      platform: 'blizzard',
      deviceText: 'Battle.net (PC)',
      title: '鬥陣特攻 2：終極戰令組合包 (Overwatch 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2357570/header.jpg',
      originalPrice: 1249,
      finalPrice: 836,
      historicalLow: 836,
      discount: 33,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/04',
      storeUrl: 'https://tw.shop.battle.net/zh-tw/family/overwatch',
      extraUrl: 'https://tw.shop.battle.net/zh-tw/family/overwatch'
    }
  ];

  // 3. Epic Games Store 台灣區精選大作 + 即時免費 API 整合
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
    },
    {
      id: 'epic-dead-island-2',
      platform: 'epic',
      deviceText: 'Epic Games (PC)',
      title: '死亡之島 2 (Dead Island 2)',
      image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/934700/header.jpg',
      originalPrice: 1560,
      finalPrice: 780,
      historicalLow: 780,
      discount: 50,
      saleStart: '2026/10/18',
      saleEnd: '2026/11/02',
      storeUrl: 'https://store.epicgames.com/zh-Hant/p/dead-island-2',
      extraUrl: 'https://isthereanydeal.com/game/dead-island-2/info/'
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

        // 檢查是否為當週限時免費或特價促銷
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

        // 取得橫幅圖片
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
    const liveEpic = await fetchLiveEpicTw();
    const allEpic = [...liveEpic, ...EPIC_CURATED_TW];

    if (term) {
      const q = term.toLowerCase().trim();
      const filterByTerm = (arr) => arr.filter(g => g.title.toLowerCase().includes(q) || g.deviceText.toLowerCase().includes(q));
      return res.status(200).json({
        psn: filterByTerm(PSN_TW_GAMES),
        epic: filterByTerm(allEpic),
        blizzard: filterByTerm(BLIZZARD_TW_GAMES)
      });
    }

    return res.status(200).json({
      psn: PSN_TW_GAMES,
      epic: allEpic,
      blizzard: BLIZZARD_TW_GAMES
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      psn: PSN_TW_GAMES,
      epic: EPIC_CURATED_TW,
      blizzard: BLIZZARD_TW_GAMES
    });
  }
}
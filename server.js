const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

const COUNTRIES = {
  US: { label: "United States", localName: "美国", path: "us", locale: "en-US", storefront: "143441-1,29" },
  JP: { label: "Japan", localName: "日本", path: "jp", locale: "ja", storefront: "143462-9,29" },
  KR: { label: "Korea", localName: "韩国", path: "kr", locale: "ko", storefront: "143466-13,29" },
  CN: { label: "China mainland", localName: "中国大陆", path: "cn", locale: "zh-Hans-CN", storefront: "143465-19,29" },
  GB: { label: "United Kingdom", localName: "英国", path: "gb", locale: "en-GB", storefront: "143444-2,29" },
  TW: { label: "Taiwan", localName: "中国台湾", path: "tw", locale: "zh-Hant-TW", storefront: "143470-18,29" },
  HK: { label: "Hong Kong", localName: "中国香港", path: "hk", locale: "zh-Hant-HK", storefront: "143463-18,29" },
  SG: { label: "Singapore", localName: "新加坡", path: "sg", locale: "en-GB", storefront: "143464-2,29" },
  DE: { label: "Germany", localName: "德国", path: "de", locale: "de-DE", storefront: "143443-4,29" },
  FR: { label: "France", localName: "法国", path: "fr", locale: "fr-FR", storefront: "143442-3,29" },
  IN: { label: "India", localName: "印度", path: "in", locale: "en-GB", storefront: "143467-2,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" },
  BR: { label: "Brazil", localName: "巴西", path: "br", locale: "pt-BR", storefront: "143503-15,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" },
  MX: { label: "Mexico", localName: "墨西哥", path: "mx", locale: "es-MX", storefront: "143468-28,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" },
  SA: { label: "Saudi Arabia", localName: "沙特阿拉伯", path: "sa", locale: "en-GB", storefront: "143479-2,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" },
  AU: { label: "Australia", localName: "澳大利亚", path: "au", locale: "en-AU", storefront: "143460-2,29" },
  NZ: { label: "New Zealand", localName: "新西兰", path: "nz", locale: "en-AU", storefront: "143461-2,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" },
  ZA: { label: "South Africa", localName: "南非", path: "za", locale: "en-GB", storefront: "143472-2,29", editorialPlatforms: "appletv,ipad,iphone,mac,watch" }
};

const PAGE_TYPES = {
  today: { label: "Today", path: "today", query: "platform=web&additionalPlatforms=appletv%2Cipad%2Ciphone%2Cmac%2CrealityDevice%2Cwatch&extend=ageRating%2CcustomArtwork%2CcustomDeepLink%2CcustomIconArtwork%2CeditorialArtwork%2CeditorialClientParams%2CeditorialVideo%2CenrichedEditorialNotes%2CheaderBadge%2CheaderName%2CheaderTagline%2CiconArtwork%2CminimumOSVersion%2CrequiredCapabilities%2CshortEditorialNotes&extend%5Beditorial-item-groups%5D=editorialClientParams&extend%5Bapp-events%5D=description%2CproductArtwork%2CproductVideo&include%5Beditorial-items%5D=header-contents%2Cmarketing-items%2Cprimary-content&include%5Beditorial-item-groups%5D=header-contents&include%5Bapp-events%5D=app&meta%5Bmarketing-items%5D=metrics&associate%5Beditorial-item-groups%5D=editorial-cards%2Crecommendations&associate%5Beditorial-items%5D=editorial-cards&sparseLimit=40&sparseCount=40&previewPlatform=iphone&meta=personalizationData&with=editorialItemGroups%2CappEvents%2CheroStyles" },
  games: { label: "Games", path: "groupings", query: "platform=web&additionalPlatforms=appletv%2Cipad%2Ciphone%2Cmac%2CrealityDevice%2Cwatch&extend=ageRating%2Cbadge-content%2CcustomArtwork%2CcustomDeepLink%2CcustomIconArtwork%2CeditorialArtwork%2CeditorialVideo%2CexpectedReleaseDateDisplayFormat%2CiconArtwork%2CisAppleWatchSupported%2CmacRequiredCapabilities%2CrequiredCapabilities%2CshowExpectedReleaseDate&extend%5Bapps%5D=isVerifiedForAppleSiliconMac&extend%5Bapp-events%5D=description%2CproductArtwork%2CproductVideo&include%5Beditorial-items%5D=marketing-items&include%5Bapp-events%5D=app&meta%5Bmarketing-items%5D=metrics&meta%5Beditorial-elements%3Acontents%5D=cppData%2CpersonalizationData&sparseLimit%5Beditorial-elements%3Acontents%5D=15&sparseCount=40&name=games&previewPlatform=iphone&with=macOSCompatibleIOSApps%2CappEvents%2CfeaturedCategories%2CcategoryBricks" }
};

const DEFAULT_DEVELOPER_IDS = ["1810952934", "1563750317", "1310407757"];
const COUNTRY_DEVELOPER_IDS = {
  CN: ["929034871"]
};

const KNOWN_CHINESE_GAME_NAMES = {
  "6746151928": "心动小镇",
  "6746141921": "伊瑟",
  "6737684676": "伊瑟",
  "6446155179": "出发吧麦芬",
  "1670576799": "铃兰之剑",
  "6451019582": "铃兰之剑",
  "1563750315": "香肠派对",
  "1593130084": "火炬之光：无限",
  "1579850555": "派对之星",
  "6503228738": "出发吧麦芬",
  "6503232968": "出发吧麦芬",
  "6503242421": "出发吧麦芬",
  "1473544990": "不休的乌拉拉",
  "1460652305": "明日之后",
  "1445639588": "明日之后",
  "1295507243": "碧蓝航线",
  "1234148531": "少女前线",
  "6748013182": "蓝色协议：星之共鸣",
  heartopia: "心动小镇",
  etheriarestart: "伊瑟",
  flashparty: "派对之星",
  "gogomuffin": "出发吧麦芬",
  "ulalaidleadventure": "不休的乌拉拉",
  "lifeafternightfalls": "明日之后",
  "girlsfrontline": "少女前线",
  "blueprotocolstarresonance": "蓝色协议：星之共鸣",
  "swordofconvallaria": "铃兰之剑",
  "sausageman": "香肠派对",
  "torchlightinfinite": "火炬之光：无限"
};

const STATIC_GAMES_BY_COUNTRY = {
  US: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"]
  ],
  JP: [
    ["6461049770", "鈴蘭の剣", "铃兰之剑"],
    ["1602814337", "T3 アリーナ", ""],
    ["6746141921", "イザリア", "伊瑟"],
    ["6503242421", "GOGOマフィン", "出发吧麦芬"],
    ["1473544990", "うらら〜ハンターライフ〜", "不休的乌拉拉"],
    ["6748013182", "ブループロトコル スターレゾナンス", "蓝色协议：星之共鸣"],
    ["1563750315", "ソーセージマン", "香肠派对"],
    ["1593130084", "トーチライト：インフィニティ", "火炬之光：无限"],
    ["6746151928", "ハートピアスローライフ", "心动小镇"],
    ["1579850555", "フラッシュパーティー", "派对之星"]
  ],
  KR: [
    ["6746151928", "두근두근타운", "心动小镇"],
    ["6746141921", "에테리아: 리스타트", "伊瑟"],
    ["6503232968", "고고 머핀", "出发吧麦芬"],
    ["1445639588", "라이프애프터", "明日之后"],
    ["1295507243", "벽람항로", "碧蓝航线"],
    ["6748013182", "블루 프로토콜 스타 레조넌스", "蓝色协议：星之共鸣"],
    ["1234148531", "소녀전선 Girls' Frontline", "少女前线"],
    ["1473544990", "오늘도 우라라 원시 헌팅 라이프", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1579850555", "Flash Party", "派对之星"]
  ],
  GB: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["1460652305", "LifeAfter: Night falls", "明日之后"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"]
  ],
  TW: [
    ["6746151928", "心動小鎮", "心动小镇"],
    ["6746141921", "伊瑟", "伊瑟"],
    ["6446155179", "出發吧麥芬", "出发吧麦芬"],
    ["1670576799", "鈴蘭之劍：為這和平的世界", "铃兰之剑"],
    ["1563750315", "香腸派對", "香肠派对"],
    ["1593130084", "火炬之光：無限", "火炬之光：无限"],
    ["1602814337", "T3 Arena", ""],
    ["1579850555", "Flash Party", "派对之星"]
  ],
  HK: [
    ["6746151928", "心動小鎮", "心动小镇"],
    ["6746141921", "伊瑟", "伊瑟"],
    ["6446155179", "出發吧麥芬", "出发吧麦芬"],
    ["1670576799", "鈴蘭之劍：為這和平的世界", "铃兰之剑"],
    ["1563750315", "香腸派對", "香肠派对"],
    ["1593130084", "火炬之光：無限", "火炬之光：无限"],
    ["1602814337", "T3 Arena", ""],
    ["1579850555", "Flash Party", "派对之星"]
  ],
  SG: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"]
  ],
  DE: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["1460652305", "LifeAfter: Night falls", "明日之后"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"]
  ],
  FR: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["1460652305", "LifeAfter: Night falls", "明日之后"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"]
  ],
  IN: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  BR: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  MX: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  SA: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  AU: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  NZ: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  ZA: [
    ["6737684676", "Etheria: Restart", "伊瑟"],
    ["1579850555", "Flash Party", "派对之星"],
    ["6503228738", "Go Go Muffin", "出发吧麦芬"],
    ["6746151928", "Heartopia", "心动小镇"],
    ["1563750315", "Sausage Man", "香肠派对"],
    ["6451019582", "Sword of Convallaria", "铃兰之剑"],
    ["1602814337", "T3 Arena", ""],
    ["1593130084", "Torchlight: Infinite", "火炬之光：无限"],
    ["1473544990", "Ulala: Idle Adventure", "不休的乌拉拉"]
  ],
  CN: [
    ["1271620263", "艾希 - ICEY", ""],
    ["1464502983", "不休的乌拉拉", ""],
    ["1614200925", "部落与弯刀", ""],
    ["1638926230", "出发吧麦芬", ""],
    ["1635913906", "传说法师", ""],
    ["6502489827", "大侠立志传", ""],
    ["1453808408", "恶果之地", ""],
    ["6499512726", "浮岛冒险", ""],
    ["1211626812", "海姆达尔 Heimdallr", ""],
    ["6751790875", "横扫千军怀旧服", ""],
    ["6446614518", "画中世界", ""],
    ["1528917194", "火炬之光：无限", ""],
    ["1576661186", "火力苏打（T3）", ""],
    ["6751309563", "火山的女儿：再度重逢", ""],
    ["1610678618", "进化之地2", ""],
    ["6449702556", "铃兰之剑：为这和平的世界", ""],
    ["1435446586", "另一个伊甸超越时空的猫", ""],
    ["1584313012", "笼中窥梦", ""],
    ["1550062096", "露西她所期望的一切", ""],
    ["1512566562", "冒险公社", ""],
    ["1579850203", "派对之星", ""],
    ["6467381694", "气球塔防6-超人气塔防手游", ""],
    ["6755228041", "潜水员戴夫", ""],
    ["1159700098", "去月球-To the Moon", ""],
    ["6443786927", "全面憨憨战争模拟器", ""],
    ["1458460469", "人类跌落梦境", ""],
    ["1498582245", "少年的人间奇遇", ""],
    ["1603751166", "神仙道小助手", ""],
    ["1380582804", "手机帝国", ""],
    ["1159266744", "双子 Gemini", ""],
    ["1157863540", "泰拉瑞亚", ""],
    ["6444396120", "挺进地牢", ""],
    ["1548443728", "骰子元素师", ""],
    ["1670078436", "无尽旅图", ""],
    ["1070092192", "仙境传说RO：天天打波利", ""],
    ["1326730621", "香肠派对", ""],
    ["1561903786", "心动小镇", ""],
    ["6466390901", "旋转音律 Rotaeno", ""],
    ["1454750038", "寻找天堂", ""],
    ["6670430491", "伊瑟", ""],
    ["6472240184", "竹马胭脂铺", ""]
  ]
};

const gameListCache = new Map();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function imageDataResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function safeDownloadName(value) {
  return cleanText(value || "AppExpo", 140)
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "AppExpo";
}

function contentDisposition(filename) {
  const ascii = filename
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/["\\;]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "AppExpo.png";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("请求 JSON 格式不正确"));
      }
    });
    req.on("error", reject);
  });
}

function appleHeaders(country) {
  return {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
    accept: "application/json,text/plain,*/*",
    "accept-language": `${country.locale},zh-CN;q=0.9,en;q=0.8`,
    "cache-control": "no-cache, max-age=0",
    pragma: "no-cache",
    origin: "https://apps.apple.com",
    referer: `https://apps.apple.com/${country.path}/iphone/games?l=${encodeURIComponent(country.locale)}`,
    "x-apple-store-front": country.storefront
  };
}

function appleCapacityError(message = "Apple API capacity exceeded") {
  const error = new Error(message);
  error.code = "APPLE_CAPACITY";
  return error;
}

function isAppleCapacityError(error) {
  return error?.code === "APPLE_CAPACITY" || /429|capacity exceeded/i.test(error?.message || "");
}

function retryDelay(attempt, error) {
  if (isAppleCapacityError(error)) return 1400 + attempt * 2200;
  return 650 + attempt * 650;
}

async function fetchJson(url, country, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: appleHeaders(country),
        redirect: "follow",
        cache: "no-cache"
      });
      const text = await response.text();
      if (response.status === 429) throw appleCapacityError(`HTTP 429: ${text.slice(0, 180)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
      }
      const data = JSON.parse(text);
      if (data && typeof data === "object" && /capacity exceeded/i.test(JSON.stringify(data).slice(0, 600))) {
        throw appleCapacityError();
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, error)));
    }
  }
  throw lastError;
}

async function fetchImageDataUrl(imageUrl) {
  const parsed = new URL(imageUrl);
  if (parsed.protocol !== "https:") throw new Error("仅支持 HTTPS 图片");
  const response = await fetch(parsed.toString(), {
    headers: {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }
  });
  if (!response.ok) throw new Error(`图片请求失败 HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) throw new Error("图片类型不正确");
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > 8 * 1024 * 1024) throw new Error("图片过大，无法导出");
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

function runPythonExport(payload) {
  return new Promise((resolve, reject) => {
    fs.mkdtemp(path.join(os.tmpdir(), "appexpo-export-"), (mkdtempError, dir) => {
      if (mkdtempError) {
        reject(mkdtempError);
        return;
      }
      const inputPath = path.join(dir, "input.json");
      const outputPath = path.join(dir, "export.png");
      fs.writeFile(inputPath, JSON.stringify(payload), (writeError) => {
        if (writeError) {
          reject(writeError);
          return;
        }
        execFile("python3", [path.join(ROOT, "scripts", "export_result.py"), inputPath, outputPath], {
          timeout: 60000,
          maxBuffer: 1024 * 1024
        }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || stdout || error.message));
            return;
          }
          fs.readFile(outputPath, (readError, buffer) => {
            if (readError) {
              reject(readError);
              return;
            }
            resolve(buffer);
          });
        });
      });
    });
  });
}

async function fetchAppleApiJson(url, country, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": appleHeaders(country)["user-agent"],
          accept: "application/json,text/plain,*/*",
          "accept-language": `${country.locale},zh-CN;q=0.9,en;q=0.8`,
          cookie: "geo=SG",
          "cache-control": "no-cache, max-age=0",
          pragma: "no-cache"
        },
        redirect: "follow",
        cache: "no-store"
      });
      const text = await response.text();
      if (/^API capacity exceeded/i.test(text)) throw appleCapacityError(`HTTP 429: ${text.slice(0, 180)}`);
      if (response.status === 429) throw appleCapacityError(`HTTP 429: ${text.slice(0, 180)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
      const data = JSON.parse(text);
      if (data && typeof data === "object" && /capacity exceeded/i.test(JSON.stringify(data).slice(0, 600))) {
        throw appleCapacityError();
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt, error)));
    }
  }
  throw lastError;
}

function editorialUrl(countryCode, pageType) {
  const country = COUNTRIES[countryCode];
  const page = PAGE_TYPES[pageType];
  const url = new URL(`https://apps.apple.com/api/apps/v1/editorial/${country.path}/${page.path}`);
  url.search = `${page.query}&l=${encodeURIComponent(country.locale)}`;
  if (country.editorialPlatforms) url.searchParams.set("additionalPlatforms", country.editorialPlatforms);
  return url.toString();
}

function developerUrl(countryCode) {
  const country = COUNTRIES[countryCode];
  return `https://apps.apple.com/${country.path}/developer/id${developerIdsForCountry(countryCode)[0]}`;
}

function developerIdsForCountry(countryCode) {
  return COUNTRY_DEVELOPER_IDS[countryCode] || DEFAULT_DEVELOPER_IDS;
}

function developerCatalogUrl(countryCode, developerId) {
  const country = COUNTRIES[countryCode];
  const url = new URL(`https://apps.apple.com/api/apps/v1/catalog/${country.path}/developers/${developerId}`);
  url.searchParams.set("platform", "web");
  url.searchParams.set("additionalPlatforms", "appletv,ipad,iphone,mac,realityDevice,watch");
  url.searchParams.set("extend", "ageRating,customArtwork,customDeepLink,customIconArtwork,editorialArtwork,editorialVideo,iconArtwork,isAppleWatchSupported,macRequiredCapabilities,minimumOSVersion,requiredCapabilities");
  url.searchParams.set("extend[apps]", "isVerifiedForAppleSiliconMac");
  url.searchParams.set("include", "app-bundles,arcade-apps,atv-apps,imessage-apps,ios-apps,latest-release-app,mac-apps,system-apps,watch-apps,xros-apps");
  url.searchParams.set("sparseLimit[developers:ios-apps]", "40");
  url.searchParams.set("with", "macOSCompatibleIOSApps");
  url.searchParams.set("l", country.locale);
  return url.toString();
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s'"’“”`~!！?？.,，。:：;；\-_/\\|()[\]{}【】<>《》+*=#&]+/g, "");
}

function cleanText(value, limit = 180) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function hasCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function uniqStrings(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const text = cleanText(value, 120);
    const key = normalize(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }
  return output;
}

function chineseNameForGame(id, name) {
  return KNOWN_CHINESE_GAME_NAMES[String(id)] || KNOWN_CHINESE_GAME_NAMES[normalize(name)] || "";
}

function gameDisplayName(name, chineseName) {
  if (!chineseName || normalize(chineseName) === normalize(name)) return name;
  if (hasCjk(name)) return name;
  return `${name} / ${chineseName}`;
}

function staticDeveloperGames(countryCode) {
  const country = COUNTRIES[countryCode];
  const rows = STATIC_GAMES_BY_COUNTRY[countryCode] || [];
  const games = rows.map(([id, name, chineseName]) => {
    const finalChineseName = chineseName || chineseNameForGame(id, name);
    return {
      id: String(id),
      name,
      chineseName: finalChineseName,
      displayName: gameDisplayName(name, finalChineseName),
      aliases: uniqStrings([name, finalChineseName]),
      artistName: "XD Entertainment",
      icon: "",
      genres: [],
      primaryGenreName: "Games",
      url: `https://apps.apple.com/${country.path}/app/id${id}`
    };
  });
  return {
    country: countryCode,
    countryLabel: country.label,
    localName: country.localName,
    source: "内置静态游戏清单",
    static: true,
    cached: true,
    games
  };
}

function resolveArtworkUrl(value, size = 720) {
  if (!value) return "";
  if (typeof value === "string") return fillArtworkTemplate(value, size, size);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = resolveArtworkUrl(item, size);
      if (found) return found;
    }
    return "";
  }
  if (typeof value !== "object") return "";

  const direct = value.urlTemplate || value.src || value.url || value.href;
  if (direct && isArtworkUrl(direct)) {
    const dimensions = artworkDimensions(value, size);
    return fillArtworkTemplate(direct, dimensions.width, dimensions.height);
  }

  const candidates = [
    value.dictionary,
    value.artwork,
    value.editorialArtwork,
    value.iconArtwork,
    value.customArtwork,
    value.productArtwork,
    value.backgroundArtwork,
    value.lockupArtwork,
    value.image,
    value.platformAttributes,
    value.ios,
    value.iphone,
    value.ipad
  ];
  for (const candidate of candidates) {
    const found = resolveArtworkUrl(candidate, size);
    if (found) return found;
  }
  return "";
}

function artworkFromKeys(value, keys, size = 960) {
  if (!value || typeof value !== "object") return "";
  for (const key of keys) {
    const parts = key.split(".");
    let current = value;
    for (const part of parts) current = current && typeof current === "object" ? current[part] : undefined;
    const found = resolveArtworkUrl(current, size);
    if (found) return found;
  }
  return "";
}

function editorialImageFromNode(node) {
  const artwork = node?.attributes?.editorialArtwork || node?.attributes?.artwork || node?.editorialArtwork;
  return artworkFromKeys(artwork, [
    "dayCard",
    "generalCard",
    "storyCenteredStatic16x9",
    "universalAStatic16x9",
    "bannerUber",
    "subscriptionHero",
    "storeFlowcase",
    "categoryDetailStatic16x9",
    "searchCategoryBrick",
    "contentGraphicTrimmed",
    "productPageHero"
  ], 2160) || resolveArtworkUrl(artwork, 2160);
}

function eventImageFromNode(node) {
  const attributes = node?.attributes || {};
  return artworkFromKeys(attributes, [
    "lockupArtwork",
    "productArtwork"
  ], 1180);
}

function appIconFromNode(node, fallback = "") {
  const attributes = node?.attributes || node || {};
  const keys = [
    "platformAttributes.ios.artwork",
    "platformAttributes.ios.customAttributes.default.default.customArtwork",
    "platformAttributes.iphone.artwork",
    "artwork",
    "customArtwork",
    "platformAttributes.ios.iconArtwork",
    "iconArtwork",
    "customIconArtwork"
  ];
  let placeholder = "";
  for (const key of keys) {
    const found = artworkFromKeys(attributes, [key], 512);
    if (!found) continue;
    if (/placeholder/i.test(found)) {
      placeholder ||= found;
      continue;
    }
    return found;
  }
  return fallback || placeholder;
}

function nearestEditorialImage(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const found = editorialImageFromNode(trail[index].node);
    if (found) return found;
  }
  return "";
}

function nearestEditorialElementKind(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const node = trail[index].node;
    const kind = node?.attributes?.editorialElementKind;
    if (kind) return String(kind);
  }
  return "";
}

function nearestEditorialPresentation(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const node = trail[index].node;
    if (!node || typeof node !== "object" || node.type !== "editorial-items") continue;
    const notes = node.attributes?.editorialNotes || node.attributes?.enrichedEditorialNotes || {};
    return {
      title: cleanText(notes.name || node.attributes?.name || node.attributes?.title || ""),
      subtitle: cleanText(notes.tagline || notes.short || node.attributes?.tagline || node.attributes?.subtitle || ""),
      badge: cleanText(notes.badge || node.attributes?.label || ""),
      callToAction: cleanText(notes.callToAction || "")
    };
  }
  return null;
}

function isCarouselTrail(trail) {
  return trail.some((item) => {
    const attributes = item.node?.attributes || {};
    return /^(415|416|495|496|556|557)$/.test(String(attributes.editorialElementKind || "")) ||
      /hero|banner|carousel|uber|large/i.test(`${attributes.displayStyle || ""} ${attributes.cardDisplayStyle || ""}`);
  });
}

function nearestEvent(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const node = trail[index].node;
    if (!node || typeof node !== "object" || node.type !== "app-events") continue;
    const attributes = node.attributes || {};
    const app = node.relationships?.app?.data?.[0] || {};
    return {
      id: node.id || "",
      title: attributes.name || "活动",
      subtitle: attributes.subtitle || "",
      description: attributes.description?.standard || attributes.description || "",
      kind: attributes.kind || attributes.eventKind || "活动",
      status: eventStatus(attributes),
      startDate: attributes.startDate || attributes.promotionStartDate || "",
      endDate: attributes.endDate || "",
      image: eventImageFromNode(node),
      appTitle: titleFromNode(app),
      appSubtitle: subtitleFromNode(app),
      appIcon: appIconFromNode(app),
      appId: app.id || "",
      url: attributes.url || ""
    };
  }
  return null;
}

function eventStatus(attributes) {
  const now = Date.now();
  const start = Date.parse(attributes.promotionStartDate || attributes.startDate || "");
  const end = Date.parse(attributes.endDate || "");
  if (Number.isFinite(end) && now > end) return "已结束";
  if (Number.isFinite(start) && now < start) return "即将开始";
  return "进行中";
}

function isArtworkUrl(value) {
  const url = String(value || "");
  return url.includes("{w}") || url.includes("mzstatic.com/image/") || /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

function artworkDimensions(value, size) {
  const sourceWidth = Number(value?.width);
  const sourceHeight = Number(value?.height);
  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: size, height: size };
  }
  if (sourceWidth >= sourceHeight) {
    return { width: size, height: Math.max(1, Math.round(size * sourceHeight / sourceWidth)) };
  }
  return { width: Math.max(1, Math.round(size * sourceWidth / sourceHeight)), height: size };
}

function fillArtworkTemplate(url, width, height = width) {
  return String(url)
    .replaceAll("{w}", String(width))
    .replaceAll("{h}", String(height))
    .replaceAll("{f}", "jpg")
    .replaceAll("{c}", "bb")
    .replace(/\{[^}]+\}/g, "");
}

function fieldValue(node, keys) {
  if (!node || typeof node !== "object") return "";
  for (const key of keys) {
    const parts = key.split(".");
    let current = node;
    for (const part of parts) current = current && typeof current === "object" ? current[part] : undefined;
    if (typeof current === "string" && current.trim()) return cleanText(current, 260);
  }
  return "";
}

function titleFromNode(node) {
  return fieldValue(node, [
    "attributes.name",
    "attributes.title",
    "attributes.headerName",
    "attributes.displayName",
    "attributes.editorialNotes.name",
    "attributes.enrichedEditorialNotes.name",
    "attributes.artistName",
    "attributes.offerName",
    "attributes.label",
    "name",
    "title",
    "headerName",
    "displayName"
  ]);
}

function subtitleFromNode(node) {
  return fieldValue(node, [
    "attributes.subtitle",
    "attributes.editorialNotes.tagline",
    "attributes.tagline",
    "attributes.headerTagline",
    "attributes.platformAttributes.ios.subtitle",
    "attributes.platformAttributes.iphone.subtitle",
    "attributes.editorialNotes.short",
    "attributes.enrichedEditorialNotes.short",
    "attributes.editorialNotes.badge",
    "attributes.enrichedEditorialNotes.badge",
    "attributes.shortEditorialNotes.standard",
    "attributes.shortEditorialNotes",
    "attributes.editorialNotes.standard",
    "attributes.description.standard",
    "attributes.description",
    "subtitle",
    "tagline",
    "description"
  ]);
}

function nodeTextBlob(node) {
  if (!node || typeof node !== "object") return "";
  const pieces = [];
  const keys = new Set([
    "name",
    "title",
    "headerName",
    "displayName",
    "subtitle",
    "tagline",
    "headerTagline",
    "description",
    "standard",
    "short"
  ]);

  function visit(value, depth = 0) {
    if (depth > 4 || !value) return;
    if (typeof value === "string") {
      if (value.length <= 320) pieces.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 12).forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof value === "object") {
      for (const [key, next] of Object.entries(value)) {
        if (keys.has(key) || key.includes("Name") || key.includes("Title") || key.includes("Notes")) {
          visit(next, depth + 1);
        }
      }
    }
  }

  visit(node);
  return pieces.join(" · ");
}

function nearestSection(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const title = titleFromNode(trail[index].node);
    if (title) return title;
  }
  return "未命名区域";
}

function nearestSource(trail, gameName) {
  const normalizedGameName = normalize(gameName);
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const node = trail[index].node;
    if (!node || typeof node !== "object") continue;
    if (node.type === "apps" || node.type === "app-events") continue;
    const title = titleFromNode(node);
    if (!title || normalize(title) === normalizedGameName) continue;
    if (/^(iphone|ipad|mac|today|games|游戏)$/i.test(title)) continue;
    return {
      title,
      subtitle: subtitleFromNode(node),
      updatedAt: node.attributes?.lastModifiedDate || "",
      displayStyle: node.attributes?.displayStyle || node.attributes?.cardDisplayStyle || "",
      kind: node.attributes?.editorialElementKind || node.attributes?.kind || node.type || ""
    };
  }
  return { title: "未命名区域", subtitle: "", updatedAt: "", displayStyle: "", kind: "" };
}

function sourceFromNode(node) {
  return {
    title: titleFromNode(node),
    subtitle: subtitleFromNode(node),
    updatedAt: node?.attributes?.lastModifiedDate || "",
    displayStyle: node?.attributes?.displayStyle || node?.attributes?.cardDisplayStyle || "",
    kind: node?.attributes?.editorialElementKind || node?.attributes?.kind || node?.type || ""
  };
}

function nearestGroupSource(trail, gameName) {
  const normalizedGameName = normalize(gameName);
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const node = trail[index].node;
    if (!node || typeof node !== "object" || node.type !== "editorial-item-groups") continue;
    const source = sourceFromNode(node);
    if (!source.title || normalize(source.title) === normalizedGameName) continue;
    return source;
  }
  return null;
}

function nearestPosition(trail, pathLabel) {
  const cardContentMatches = Array.from(pathLabel.matchAll(/(?:^|\.)card-contents\.data\[(\d+)\]/g));
  if (cardContentMatches.length) return Number(cardContentMatches.at(-1)[1]) + 1;
  const contentMatches = Array.from(pathLabel.matchAll(/(?:^|\.)contents\.data\[(\d+)\]/g));
  if (contentMatches.length) return Number(contentMatches.at(-1)[1]) + 1;
  const recommendationMatches = Array.from(pathLabel.matchAll(/(?:^|\.)recommendations\.data\[(\d+)\]/g));
  if (recommendationMatches.length) return Number(recommendationMatches.at(-1)[1]) + 1;
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    if (Number.isInteger(trail[index].index)) return trail[index].index + 1;
  }
  return null;
}

function todayModulePosition(pathLabel) {
  const match = pathLabel.match(/^root\.results\.data\[\d+\]\.contents\[(\d+)\]/);
  return match ? Number(match[1]) + 1 : null;
}

function recommendationPosition(pathLabel) {
  const matches = Array.from(pathLabel.matchAll(/(?:^|\.)recommendations\.data\[(\d+)\]/g));
  return matches.length ? Number(matches.at(-1)[1]) + 1 : null;
}

function todayRecommendations(content) {
  return content?.meta?.associations?.recommendations?.data ||
    content?.relationships?.recommendations?.data ||
    content?.recommendations?.data ||
    [];
}

function isRenderableTodayCard(item) {
  return !!item && typeof item === "object" && (
    titleFromNode(item) ||
    subtitleFromNode(item) ||
    editorialImageFromNode(item) ||
    item.type === "apps" ||
    item.type === "app-events" ||
    item.type === "editorial-items"
  );
}

function todayVisibleCardCount(content) {
  const recommendations = todayRecommendations(content).filter(isRenderableTodayCard);
  return recommendations.length || (isRenderableTodayCard(content) ? 1 : 0);
}

function todayVisualGroupPosition(content, rawPosition) {
  if (!rawPosition) return null;
  return rawPosition;
}

function todayPositionDetails(data, pathLabel) {
  const match = pathLabel.match(/^root\.results\.data\[(\d+)\]\.contents\[(\d+)\]/);
  if (!match) return { overallPosition: null, modulePosition: null, itemPosition: null, groupPosition: null };
  const pageIndex = Number(match[1]);
  const moduleIndex = Number(match[2]);
  const contents = data?.results?.data?.[pageIndex]?.contents || [];
  const module = contents[moduleIndex];
  const recommendations = todayRecommendations(module).filter(isRenderableTodayCard);
  const rawItemPosition = recommendationPosition(pathLabel) || (recommendations.length ? 1 : null);
  const itemPosition = todayVisualGroupPosition(module, rawItemPosition);
  const priorCount = contents
    .slice(0, moduleIndex)
    .reduce((total, content) => total + todayVisibleCardCount(content), 0);
  return {
    overallPosition: priorCount + (itemPosition || 1),
    modulePosition: moduleIndex + 1,
    itemPosition,
    rawItemPosition,
    groupPosition: itemPosition || 1
  };
}

function objectAtPath(root, pathLabel) {
  const tokens = [];
  pathLabel.replace(/(?:^|\.)([^\.\[\]]+)|\[(\d+)\]/g, (_match, key, index) => {
    if (key && key !== "root") tokens.push(key);
    if (index !== undefined) tokens.push(Number(index));
    return "";
  });
  let current = root;
  for (const token of tokens) {
    current = current?.[token];
    if (current === undefined || current === null) return null;
  }
  return current;
}

function hasRenderableCarouselContent(node) {
  return String(node?.attributes?.editorialElementKind || "") === "416" &&
    Array.isArray(node?.relationships?.contents?.data) &&
    node.relationships.contents.data.some((item) => editorialImageFromNode(item));
}

function carouselPositionFromPath(data, pathLabel) {
  const matches = Array.from(pathLabel.matchAll(/relationships\.children\.data\[(\d+)\]/g));
  let slideId = "";
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const nodePath = pathLabel.slice(0, matches[index].index + matches[index][0].length);
    const node = objectAtPath(data, nodePath);
    if (String(node?.attributes?.editorialElementKind || "") === "416") {
      slideId = node.id || "";
      break;
    }
  }
  if (!slideId) return null;

  const visited = new WeakSet();
  function findPosition(node) {
    if (!node || typeof node !== "object") return null;
    if (visited.has(node)) return null;
    visited.add(node);
    if (Array.isArray(node)) {
      if (node.some((item) => String(item?.attributes?.editorialElementKind || "") === "416")) {
        const visibleSlides = node.filter(hasRenderableCarouselContent);
        const position = visibleSlides.findIndex((item) => item.id === slideId);
        if (position >= 0) return position + 1;
      }
      for (const item of node) {
        const found = findPosition(item);
        if (found) return found;
      }
      return null;
    }
    for (const value of Object.values(node)) {
      const found = findPosition(value);
      if (found) return found;
    }
    return null;
  }

  return findPosition(data);
}

function nearestCarouselPosition(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const item = trail[index];
    const kind = String(item.node?.attributes?.editorialElementKind || "");
    if (kind === "416" && Number.isInteger(item.index)) return item.index + 1;
  }
  return null;
}

function nearestUpdatedAt(trail) {
  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const attributes = trail[index].node?.attributes || {};
    const updatedAt = attributes.lastModifiedDate || attributes.modifiedDate || attributes.updatedAt;
    if (updatedAt) return updatedAt;
  }
  return "";
}

function extractPageDate(data) {
  return data?.results?.data?.[0]?.date || data?.data?.[0]?.attributes?.lastModifiedDate || "";
}

function placementTypeFrom(matchPath, source) {
  const style = `${source.displayStyle} ${source.kind}`.toLowerCase();
  if (/app-events|活动|event/i.test(style) || /app-events/.test(matchPath)) return "活动";
  if (/hero|banner|large|uber|556|495/.test(style)) return "顶部轮播/大图位";
  if (/chart|377/.test(style)) return "排行榜";
  if (/contents\.data/.test(matchPath)) return "内容列表";
  return "展位";
}

function gamesDisplayRank(mediaMode) {
  if (mediaMode === "carousel") return 0;
  if (mediaMode === "event") return 1;
  return 2;
}

function uniqueNodesById(nodes) {
  const seen = new Set();
  return nodes.filter((node) => {
    const key = `${node?.type || ""}:${node?.id || node?.attributes?.adamId || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nodesByType(root, type) {
  const results = [];
  const visited = new WeakSet();
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);
    if (node.type === type) results.push(node);
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    Object.values(node).forEach(visit);
  }
  visit(root);
  return uniqueNodesById(results);
}

function firstNodeByType(root, type) {
  return nodesByType(root, type)[0] || null;
}

function appFromEventNode(eventNode) {
  return eventNode?.relationships?.app?.data?.find((item) => item?.type === "apps") || null;
}

function directPlacementParts(item) {
  if (!item || typeof item !== "object") return [];
  if (item.type === "apps") return [{ appNode: item, eventNode: null, item, relationshipKey: "", relatedIndex: 0 }];
  if (item.type === "app-events") {
    const appNode = appFromEventNode(item);
    return appNode ? [{ appNode, eventNode: item, item, relationshipKey: "", relatedIndex: 0 }] : [];
  }

  const relationshipKeys = ["card-contents", "primary-content", "marketing-items"];
  const parts = [];
  for (const key of relationshipKeys) {
    const related = item.relationships?.[key]?.data || [];
    for (let relatedIndex = 0; relatedIndex < related.length; relatedIndex += 1) {
      const relatedItem = related[relatedIndex];
      if (relatedItem?.type === "apps") {
        parts.push({ appNode: relatedItem, eventNode: null, item, relationshipKey: key, relatedIndex });
      } else if (relatedItem?.type === "app-events") {
        const appNode = appFromEventNode(relatedItem);
        if (appNode) parts.push({ appNode, eventNode: relatedItem, item, relationshipKey: key, relatedIndex });
      }
    }
  }
  return parts;
}

function presentationFromEditorialItem(node) {
  const notes = node?.attributes?.editorialNotes || node?.attributes?.enrichedEditorialNotes || {};
  return {
    title: cleanText(notes.name || node?.attributes?.headerName || node?.attributes?.name || node?.attributes?.title || ""),
    subtitle: cleanText(notes.tagline || notes.short || node?.attributes?.headerTagline || node?.attributes?.tagline || node?.attributes?.subtitle || ""),
    badge: cleanText(notes.badge || node?.attributes?.label || ""),
    callToAction: cleanText(notes.callToAction || "")
  };
}

function presentationFromEditorialGroup(node, fallbackTitle = "") {
  const notes = node?.attributes?.editorialNotes || node?.attributes?.enrichedEditorialNotes || {};
  return {
    title: cleanText(notes.name || node?.attributes?.headerName || node?.attributes?.name || fallbackTitle || ""),
    subtitle: cleanText(notes.tagline || notes.short || node?.attributes?.headerTagline || node?.attributes?.tagline || ""),
    badge: cleanText(notes.badge || node?.attributes?.label || "")
  };
}

function eventDetailsFromNode(eventNode, appNode) {
  if (!eventNode) return null;
  const attributes = eventNode.attributes || {};
  return {
    id: eventNode.id || "",
    title: attributes.name || "活动",
    subtitle: attributes.subtitle || "",
    description: attributes.description?.standard || attributes.description || "",
    kind: attributes.kind || attributes.eventKind || "活动",
    status: eventStatus(attributes),
    startDate: attributes.startDate || attributes.promotionStartDate || "",
    endDate: attributes.endDate || "",
    image: eventImageFromNode(eventNode),
    appTitle: titleFromNode(appNode),
    appSubtitle: subtitleFromNode(appNode),
    appIcon: appIconFromNode(appNode),
    appId: appNode?.id || "",
    url: attributes.url || ""
  };
}

function appNameTextBlob(appNode) {
  if (!appNode || typeof appNode !== "object" || appNode.type !== "apps") return "";
  const attributes = appNode.attributes || {};
  return normalize([
    attributes.name,
    attributes.platformAttributes?.ios?.name,
    attributes.platformAttributes?.iphone?.name,
    attributes.platformAttributes?.ipad?.name,
    appNode.name
  ].filter(Boolean).join(" "));
}

function placementTextBlob(placement) {
  return normalize([
    placement.sectionTitle,
    placement.sectionSubtitle,
    placement.placementTitle,
    placement.subtitle,
    placement.description,
    placement.eventKind,
    placement.appTitle,
    placement.appSubtitle
  ].filter(Boolean).join(" "));
}

function makePlacement({
  data,
  options,
  pageType,
  pageLabel,
  section,
  item,
  appNode,
  eventNode,
  mediaMode,
  placementType,
  position,
  modulePosition,
  itemPosition,
  groupItemCount,
  contentPosition,
  overallPosition,
  path,
  updatedAt,
  pageDate
}) {
  const presentation = presentationFromEditorialItem(item);
  const event = eventDetailsFromNode(eventNode, appNode);
  const appTitle = titleFromNode(appNode) || options.gameName || "";
  const appSubtitle = subtitleFromNode(appNode);
  const iconImage = appIconFromNode(appNode, options.appIcon || "");
  const editorialImage = editorialImageFromNode(item) || editorialImageFromNode(section);
  const eventImage = event?.image || "";
  const isTodayEditorialCard = pageType === "today" && !event;
  const image = mediaMode === "carousel" || mediaMode === "hero"
    ? editorialImage || eventImage || iconImage
    : mediaMode === "event"
    ? editorialImage || eventImage || iconImage
    : iconImage;
  const groupSource = pageType === "today"
    ? presentationFromEditorialGroup(section, pageLabel || "Today")
    : null;
  const rawGroupTitle = titleFromNode(section);
  const groupTitle = pageType === "today"
    ? groupSource.title || rawGroupTitle || pageLabel || "Today"
    : rawGroupTitle || "";
  const groupSubtitle = pageType === "today"
    ? groupSource.subtitle || subtitleFromNode(section) || ""
    : subtitleFromNode(section) || "";
  const todayCardTitle = presentation.title || event?.title || appTitle || groupTitle || "展位";
  const todayCardSubtitle = presentation.subtitle || event?.subtitle || appSubtitle || "";
  const sectionTitle = pageType === "today"
    ? todayCardTitle
    : isTodayEditorialCard
    ? presentation.title || titleFromNode(section) || "未命名区域"
    : titleFromNode(section) || (mediaMode === "carousel" ? "顶部轮播" : "未命名区域");
  const sectionSubtitle = pageType === "today"
    ? todayCardSubtitle
    : isTodayEditorialCard
    ? presentation.subtitle || subtitleFromNode(section)
    : subtitleFromNode(section);
  const defaultPlacementType = event ? sectionTitle : isTodayEditorialCard ? sectionTitle : "内容列表";
  const placementTitle = pageType === "today"
    ? todayCardTitle
    : event && (presentation.title || event.title)
    ? presentation.title || event.title
    : isTodayEditorialCard
    ? appTitle || presentation.title || sectionTitle
    : presentation.title || appTitle || sectionTitle;
  const subtitle = pageType === "today"
    ? todayCardSubtitle
    : event && (presentation.subtitle || event.subtitle)
    ? presentation.subtitle || event.subtitle
    : isTodayEditorialCard
    ? appSubtitle || ""
    : presentation.subtitle || appSubtitle || "";
  const description = event?.description || cleanText(nodeTextBlob(item), 260);
  const appNameText = appNameTextBlob(appNode);
  const searchText = pageType === "today"
    ? normalize([
      appNameText,
      groupTitle,
      groupSubtitle,
      sectionTitle,
      sectionSubtitle,
      placementTitle,
      subtitle,
      description,
      event?.title,
      event?.subtitle,
      event?.kind,
      event?.description,
      appTitle,
      appSubtitle,
      nodeTextBlob(item)
    ].filter(Boolean).join(" "))
    : appNameText;
  return {
    pageType,
    pageLabel,
    sectionTitle,
    sectionSubtitle,
    groupTitle,
    groupSubtitle,
    placementType: placementType || defaultPlacementType,
    placementTitle,
    subtitle,
    description,
    eventStatus: event?.status || "",
    eventKind: event && (presentation.badge || event.kind) ? (presentation.badge || event.kind) : "",
    eventStartDate: event?.startDate || "",
    eventEndDate: event?.endDate || "",
    callToAction: presentation.callToAction || "",
    appTitle: event?.appTitle || appTitle,
    appSubtitle: event?.appSubtitle || appSubtitle,
    appIcon: event?.appIcon || iconImage,
    position,
    modulePosition,
    itemPosition,
    groupItemCount,
    contentPosition,
    overallPosition,
    updatedAt: updatedAt || section?.attributes?.lastModifiedDate || pageDate || extractPageDate(data),
    checkedAt: options.checkedAt,
    type: "apps",
    id: String(appNode?.id || appNode?.attributes?.adamId || ""),
    appNameText,
    searchText,
    image,
    heroImage: editorialImage || eventImage,
    iconImage,
    mediaMode,
    editorialKind: section?.attributes?.editorialElementKind || "",
    path,
    textSnippet: cleanText(nodeTextBlob(item), 260)
  };
}

function visualTodayRecommendations(content) {
  const recommendations = todayRecommendations(content).filter(isRenderableTodayCard);
  return recommendations.map((item, index) => ({ item, rawIndex: index }));
}

function buildTodayPlacementIndexOriginal(data, options) {
  const page = data?.results?.data?.[0] || {};
  const contents = Array.isArray(page.contents) ? page.contents : [];
  const placements = [];
  let overallPosition = 0;
  contents.forEach((section, sectionIndex) => {
    const visualItems = visualTodayRecommendations(section);
    const cards = visualItems.length ? visualItems : [{ item: section, rawIndex: 0 }];
    cards.forEach(({ item, rawIndex }, visualIndex) => {
      const apps = nodesByType(item, "apps");
      if (!apps.length) return;
      overallPosition += 1;
      const eventNode = firstNodeByType(item, "app-events");
      apps.forEach((appNode) => {
        placements.push(makePlacement({
          data,
          options,
          pageType: "today",
          pageLabel: PAGE_TYPES.today.label,
          section,
          item,
          appNode,
          eventNode,
          mediaMode: eventNode ? "event" : editorialImageFromNode(item) ? "hero" : "icon",
          placementType: eventNode ? titleFromNode(section) || PAGE_TYPES.today.label : placementTypeFrom("today", sourceFromNode(section)),
          position: visualIndex + 1,
          modulePosition: sectionIndex + 1,
          itemPosition: visualIndex + 1,
          groupItemCount: cards.length,
          overallPosition,
          path: `today.contents[${sectionIndex}].recommendations[${rawIndex}]`,
          updatedAt: section.attributes?.lastModifiedDate || page.date || "",
          pageDate: page.date || ""
        }));
      });
    });
  });
  return placements;
}

function buildTodayPlacementIndexExpanded(data, options) {
  const page = data?.results?.data?.[0] || {};
  const contents = Array.isArray(page.contents) ? page.contents : [];
  const placements = [];
  let overallPosition = 0;
  contents.forEach((section, sectionIndex) => {
    const visualItems = visualTodayRecommendations(section);
    const cards = visualItems.length ? visualItems : [{ item: section, rawIndex: 0 }];
    cards.forEach(({ item, rawIndex }, visualIndex) => {
      const parts = directPlacementParts(item);
      if (!parts.length) return;
      overallPosition += 1;
      parts.forEach(({ appNode, eventNode, relationshipKey, relatedIndex }) => {
        const nestedSuffix = relationshipKey ? `.${relationshipKey}[${relatedIndex}]` : "";
        placements.push(makePlacement({
          data,
          options,
          pageType: "today",
          pageLabel: PAGE_TYPES.today.label,
          section,
          item,
          appNode,
          eventNode,
          mediaMode: eventNode ? "event" : editorialImageFromNode(item) ? "hero" : "icon",
          placementType: eventNode ? titleFromNode(section) || PAGE_TYPES.today.label : placementTypeFrom("today", sourceFromNode(section)),
          position: visualIndex + 1,
          modulePosition: sectionIndex + 1,
          itemPosition: visualIndex + 1,
          groupItemCount: cards.length,
          contentPosition: Number.isInteger(relatedIndex) ? relatedIndex + 1 : null,
          overallPosition,
          path: `today.contents[${sectionIndex}].recommendations[${rawIndex}]${nestedSuffix}`,
          updatedAt: section.attributes?.lastModifiedDate || page.date || "",
          pageDate: page.date || ""
        }));
      });
    });
  });
  return placements;
}

function buildTodayPlacementIndex(data, options) {
  return buildTodayPlacementIndexExpanded(data, options);
}

function gamesChildren(data) {
  return data?.data?.[0]?.relationships?.tabs?.data?.[0]?.relationships?.children?.data || [];
}

function buildGamesPlacementIndex(data, options) {
  const children = gamesChildren(data);
  const placements = [];
  children.forEach((section, sectionIndex) => {
    const kind = String(section?.attributes?.editorialElementKind || "");
    if (kind === "415") {
      let visiblePosition = 0;
      const slides = section.relationships?.children?.data || [];
      slides.forEach((slide, slideIndex) => {
        const item = slide.relationships?.contents?.data?.[0];
        if (!item || !editorialImageFromNode(item)) return;
        visiblePosition += 1;
        const parts = directPlacementParts(item);
        parts.forEach(({ appNode, eventNode }) => {
          placements.push(makePlacement({
            data,
            options,
            pageType: "games",
            pageLabel: PAGE_TYPES.games.label,
            section: { ...slide, attributes: { ...(slide.attributes || {}), name: "顶部轮播" } },
            item,
            appNode,
            eventNode,
            mediaMode: "carousel",
            placementType: eventNode ? "顶部轮播/活动" : "顶部轮播",
            position: visiblePosition,
            modulePosition: sectionIndex + 1,
            itemPosition: visiblePosition,
            overallPosition: null,
            path: `games.carousel[${slideIndex}]`,
            updatedAt: slide.attributes?.lastModifiedDate || section.attributes?.lastModifiedDate || ""
          }));
        });
      });
      return;
    }

    const nestedSections = section.relationships?.children?.data?.length ? section.relationships.children.data : [section];
    nestedSections.forEach((nested, nestedIndex) => {
      const contents = nested.relationships?.contents?.data || [];
      contents.forEach((item, itemIndex) => {
        const parts = directPlacementParts(item);
        if (!parts.length) return;
        parts.forEach(({ appNode, eventNode }) => {
          placements.push(makePlacement({
            data,
            options,
            pageType: "games",
            pageLabel: PAGE_TYPES.games.label,
            section: nested,
            item,
            appNode,
            eventNode,
            mediaMode: eventNode ? "event" : "icon",
            placementType: eventNode ? titleFromNode(nested) || "活动" : placementTypeFrom(`contents.data[${itemIndex}]`, sourceFromNode(nested)),
            position: itemIndex + 1,
            modulePosition: sectionIndex + 1,
            itemPosition: itemIndex + 1,
            overallPosition: null,
            path: `games.children[${sectionIndex}].${nestedIndex}.contents[${itemIndex}]`,
            updatedAt: nested.attributes?.lastModifiedDate || section.attributes?.lastModifiedDate || ""
          }));
        });
      });
    });
  });
  return placements;
}

function buildPlacementIndex(data, options) {
  return options.pageType === "today"
    ? buildTodayPlacementIndex(data, options)
    : buildGamesPlacementIndex(data, options);
}

function analyzeEditorialJson(data, options) {
  const terms = Array.from(new Set([
    options.gameName,
    ...(options.aliases || [])
  ].filter(Boolean).map(normalize).filter(Boolean)));
  const matches = [];
  const seen = new Set();
  const visited = new WeakSet();

  function isMatch(node) {
    const title = titleFromNode(node);
    const subtitle = subtitleFromNode(node);
    const blob = normalize([title, subtitle, nodeTextBlob(node)].filter(Boolean).join(" "));
    return terms.some((term) => term && blob.includes(term));
  }

  function placementIsMatch(placement) {
    const blob = placement.searchText || placement.appNameText || "";
    return terms.some((term) => term && blob.includes(term));
  }

  function finalize(foundMatches) {
    const unique = [];
    const uniqueKeys = new Set();
    for (const match of foundMatches) {
      const key = [
        match.pageType,
        match.mediaMode,
        match.id,
        match.sectionTitle,
        match.modulePosition || "",
        match.itemPosition || match.position || "",
        match.placementTitle
      ].join("|");
      if (uniqueKeys.has(key)) continue;
      uniqueKeys.add(key);
      unique.push(match);
    }

    const iconById = new Map();
    for (const match of unique) {
      if (match.id && match.appIcon) iconById.set(match.id, match.appIcon);
      if (match.id && match.iconImage) iconById.set(match.id, match.iconImage);
    }
    for (const match of unique) {
      const fallbackIcon = match.id ? iconById.get(match.id) : "";
      if (!match.appIcon && fallbackIcon) match.appIcon = fallbackIcon;
      if (!match.iconImage && fallbackIcon) match.iconImage = fallbackIcon;
      if (match.mediaMode === "icon" && !match.image && fallbackIcon) match.image = fallbackIcon;
    }

    return unique
      .sort((a, b) => {
        const pageA = a.pageType.localeCompare(b.pageType);
        if (pageA) return pageA;
        if (options.pageType === "games") {
          const displayRank = gamesDisplayRank(a.mediaMode) - gamesDisplayRank(b.mediaMode);
          if (displayRank) return displayRank;
        }
        if (options.pageType === "today") {
          const moduleRank = (a.modulePosition || 9999) - (b.modulePosition || 9999);
          if (moduleRank) return moduleRank;
          return (a.itemPosition || a.position || 9999) - (b.itemPosition || b.position || 9999);
        }
        return (a.position || 9999) - (b.position || 9999);
      })
      .slice(0, 80);
  }

  if (options.pageType === "today" || options.pageType === "games") {
    const placementIndex = buildPlacementIndex(data, options);
    const indexedMatches = placementIndex.filter(placementIsMatch);
    if (indexedMatches.length || placementIndex.length) return finalize(indexedMatches);
  }

  function addMatch(node, trail, pathLabel) {
    const title = titleFromNode(node);
    const subtitle = subtitleFromNode(node);
    const text = cleanText(nodeTextBlob(node), 260);
    const id = node && typeof node === "object" ? node.id || node.attributes?.adamId || node.attributes?.id || "" : "";
    const type = node && typeof node === "object" ? node.type || node.kind || "" : "";
    if (type !== "apps") return;
    if (!id && !type && /\.attributes$/.test(pathLabel)) return;
    const event = nearestEvent(trail.slice(0, -1));
    const genericSource = nearestSource(trail.slice(0, -1), options.gameName);
    const groupSource = event && options.pageType === "today" ? nearestGroupSource(trail.slice(0, -1), options.gameName) : null;
    const source = groupSource || genericSource;
    const carousel = options.pageType === "games" && isCarouselTrail(trail.slice(0, -1));
    const editorialKind = nearestEditorialElementKind(trail.slice(0, -1));
    const presentation = nearestEditorialPresentation(trail.slice(0, -1));
    const sectionTitle = carousel && (!source.title || source.title === "未命名区域")
      ? "顶部轮播"
      : source.title || nearestSection(trail.slice(0, -1));
    const todayDetails = options.pageType === "today" ? todayPositionDetails(data, pathLabel) : null;
    const position = options.pageType === "today"
      ? todayDetails.groupPosition || nearestPosition(trail, pathLabel)
      : carousel
      ? carouselPositionFromPath(data, pathLabel) || nearestCarouselPosition(trail.slice(0, -1)) || nearestPosition(trail, pathLabel)
      : nearestPosition(trail, pathLabel);
    const modulePosition = todayDetails?.modulePosition || null;
    const itemPosition = todayDetails?.itemPosition || recommendationPosition(pathLabel);
    const overallPosition = todayDetails?.overallPosition || null;
    const editorialImage = nearestEditorialImage(trail.slice(0, -1));
    const eventImage = event?.image || "";
    const heroImage = carousel ? editorialImage || eventImage : eventImage || editorialImage;
    const iconImage = appIconFromNode(node, options.appIcon || "");
    const useEditorialPresentation = !!presentation && (carousel || (event && options.pageType === "today"));
    const placementType = event
      ? (carousel ? "顶部轮播/活动" : options.pageType === "today" && sectionTitle ? sectionTitle : "活动")
      : placementTypeFrom(pathLabel, source);
    const mediaMode = event
      ? (carousel ? "carousel" : "event")
      : heroImage && (options.pageType === "today" || /顶部|轮播|大图/.test(placementType)) ? "hero" : "icon";
    const image = mediaMode === "hero" || mediaMode === "event" ? heroImage : iconImage;
    const displayImage = mediaMode === "carousel" ? heroImage : image;
    const key = event
      ? [options.pageType, mediaMode, event.id, editorialKind, id || title || options.gameName].join("|")
      : [options.pageType, id || title || options.gameName, pathLabel].join("|");
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({
      pageType: options.pageType,
      pageLabel: PAGE_TYPES[options.pageType].label,
      sectionTitle,
      sectionSubtitle: source.subtitle,
      placementType,
      placementTitle: useEditorialPresentation && presentation.title ? presentation.title : event?.title || title || options.gameName || sectionTitle,
      subtitle: useEditorialPresentation && presentation.subtitle ? presentation.subtitle : event?.subtitle || subtitle || "",
      description: event?.description || text,
      eventStatus: event?.status || "",
      eventKind: useEditorialPresentation && presentation.badge ? presentation.badge : event?.kind || "",
      callToAction: useEditorialPresentation && presentation.callToAction ? presentation.callToAction : "",
      eventStartDate: event?.startDate || "",
      eventEndDate: event?.endDate || "",
      appTitle: event?.appTitle || title || options.gameName || "",
      appSubtitle: event?.appSubtitle || subtitle || "",
      appIcon: event?.appIcon || iconImage,
      position,
      modulePosition,
      itemPosition,
      overallPosition,
      updatedAt: source.updatedAt || nearestUpdatedAt(trail.slice(0, -1)) || extractPageDate(data),
      checkedAt: options.checkedAt,
      type,
      id: String(id || ""),
      image: displayImage,
      heroImage,
      iconImage,
      mediaMode,
      editorialKind,
      path: pathLabel,
      textSnippet: text
    });
  }

  function walk(node, trail, pathLabel) {
    if (!node || typeof node !== "object") return;
    if (visited.has(node)) return;
    visited.add(node);

    const currentTrail = trail.concat({ node, index: null });
    if (isMatch(node)) addMatch(node, currentTrail, pathLabel);

    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const arrayTrail = trail.concat({ node: item, index });
        if (item && typeof item === "object" && isMatch(item)) addMatch(item, arrayTrail, `${pathLabel}[${index}]`);
        walk(item, arrayTrail, `${pathLabel}[${index}]`);
      });
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") {
        walk(value, currentTrail, pathLabel ? `${pathLabel}.${key}` : key);
      }
    }
  }

  walk(data, [], "root");

  return finalize(matches);
}

async function fetchDeveloperGames(countryCode) {
  if (gameListCache.has(countryCode)) {
    return {
      ...gameListCache.get(countryCode),
      cached: true
    };
  }

  const country = COUNTRIES[countryCode];
  const developerIds = developerIdsForCountry(countryCode);
  const catalogUrls = developerIds.map((developerId) => developerCatalogUrl(countryCode, developerId));
  const unique = new Map();
  const errors = [];
  const sourceCounts = {};
  const loadedDeveloperIds = [];

  for (let index = 0; index < developerIds.length; index += 1) {
    const developerId = developerIds[index];
    const catalogUrl = catalogUrls[index];
    try {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, 900));
      const catalog = await fetchAppleApiJson(catalogUrl, country, 3);
      const developer = Array.isArray(catalog.data) ? catalog.data[0] : null;
      const relationshipGroups = Object.values(developer?.relationships || {})
        .flatMap((relationship) => Array.isArray(relationship?.data) ? relationship.data : [])
        .filter((item) => item?.type === "apps");
      sourceCounts[developerId] = relationshipGroups.length;
      loadedDeveloperIds.push(developerId);

      for (const item of relationshipGroups) {
        const attributes = item.attributes || {};
        if (!attributes.name) continue;
        const platform = attributes.platformAttributes?.ios || attributes.platformAttributes?.iphone || {};
        const genres = item.relationships?.genres?.data?.map((genre) => genre.attributes?.name).filter(Boolean) || [];
        const id = String(item.id);
        const existing = unique.get(id);
        const name = attributes.name || platform.name || "Untitled";
        const chineseName = chineseNameForGame(id, name);
        const aliases = uniqStrings([
          existing?.name,
          existing?.chineseName,
          ...(existing?.aliases || []),
          name,
          platform.name,
          chineseName
        ]);
        unique.set(id, {
          ...existing,
          id: String(item.id),
          name,
          chineseName,
          displayName: gameDisplayName(name, chineseName),
          aliases,
          artistName: attributes.artistName || developer?.attributes?.name || "XD Entertainment Co., Ltd.",
          icon: resolveArtworkUrl(platform.artwork, 512) || resolveArtworkUrl(attributes.artwork, 512) || resolveArtworkUrl(attributes, 512) || existing?.icon || "",
          genres: genres.length ? genres : existing?.genres || [],
          primaryGenreName: attributes.genreDisplayName || genres[0] || existing?.primaryGenreName || "Games",
          url: attributes.url || `https://apps.apple.com/${country.path}/app/id${item.id}`
        });
      }
    } catch (catalogError) {
      sourceCounts[developerId] = 0;
      errors.push(`${developerId}: ${catalogError.message || "接口请求失败"}`);
    }
  }

  if (unique.size) {
    const games = Array.from(unique.values()).sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hans-CN"));
    const partial = loadedDeveloperIds.length < developerIds.length;
    const result = {
      country: countryCode,
      countryLabel: country.label,
      localName: country.localName,
      source: developerUrl(countryCode),
      developerIds,
      loadedDeveloperIds,
      sourceCounts,
      catalogApis: catalogUrls,
      catalogApi: catalogUrls[0],
      cached: false,
      partial,
      errors,
      cachedAt: new Date().toISOString(),
      games
    };
    if (!partial) gameListCache.set(countryCode, result);
    return result;
  }

  if (errors.length && developerIds.length === 1 && !/404|not found/i.test(errors[0])) {
    throw new Error(errors[0]);
  }

  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", "XD Entertainment Co., Ltd.");
  url.searchParams.set("entity", "software");
  url.searchParams.set("country", countryCode);
  url.searchParams.set("limit", "80");

  const data = await fetchJson(url.toString(), country, 1);
  const rawResults = Array.isArray(data.results) ? data.results : [];
  const fallbackUnique = new Map();
  for (const item of rawResults) {
    if (!item.trackId || !item.trackName) continue;
    const artist = `${item.artistName || ""} ${item.sellerName || ""}`;
    if (!/xd entertainment|心动网络|心动娱乐/i.test(artist)) continue;
    const chineseName = chineseNameForGame(item.trackId, item.trackName);
    fallbackUnique.set(item.trackId, {
      id: String(item.trackId),
      name: item.trackName,
      chineseName,
      displayName: gameDisplayName(item.trackName, chineseName),
      aliases: uniqStrings([item.trackName, chineseName]),
      artistName: item.artistName || item.sellerName || "XD Entertainment",
      icon: item.artworkUrl512 || item.artworkUrl100 || item.artworkUrl60 || "",
      genres: item.genres || [],
      primaryGenreName: item.primaryGenreName || "",
      url: item.trackViewUrl || `https://apps.apple.com/${country.path}/app/id${item.trackId}`
    });
  }

  const results = Array.from(fallbackUnique.values());
  const gameResults = results.filter((item) => {
    const genreText = `${item.primaryGenreName} ${(item.genres || []).join(" ")}`.toLowerCase();
    return /game|游戏|jeu|spiel|ゲーム|게임/.test(genreText);
  });

  const fallbackResult = {
    country: countryCode,
    countryLabel: country.label,
    localName: country.localName,
    source: developerUrl(countryCode),
    developerIds,
    catalogApis: catalogUrls,
    catalogApi: catalogUrls[0],
    searchApi: url.toString(),
    cached: false,
    cachedAt: new Date().toISOString(),
    games: gameResults.length ? gameResults : results
  };
  gameListCache.set(countryCode, fallbackResult);
  return fallbackResult;
}

async function analyzeCountry(countryCode, gameName, appId, pageTypes, aliases, checkedAt, appIcon) {
  const country = COUNTRIES[countryCode];
  const results = [];
  for (const pageType of pageTypes) {
    const url = editorialUrl(countryCode, pageType);
    try {
      const data = await fetchAppleApiJson(url, country, 2);
      const matches = analyzeEditorialJson(data, { countryCode, gameName, appId, aliases, pageType, checkedAt, appIcon });
      results.push({
        country: countryCode,
        countryLabel: country.label,
        localName: country.localName,
        pageType,
        pageLabel: PAGE_TYPES[pageType].label,
        url,
        found: matches.length > 0,
        matches
      });
    } catch (error) {
      results.push({
        country: countryCode,
        countryLabel: country.label,
        localName: country.localName,
        pageType,
        pageLabel: PAGE_TYPES[pageType].label,
        url,
        found: false,
        matches: [],
        error: isAppleCapacityError(error)
          ? "Apple API 临时限流，请稍后重新分析"
          : error.message || "接口请求失败"
      });
    }
  }
  return results;
}

function staticFile(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const relativePath = requestUrl.pathname === "/" ? "/index.html" : decodeURIComponent(requestUrl.pathname);
  const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "GET" && requestUrl.pathname === "/api/config") {
      jsonResponse(res, 200, {
        countries: Object.entries(COUNTRIES).map(([code, country]) => ({ code, ...country })),
        pageTypes: Object.entries(PAGE_TYPES).map(([value, page]) => ({ value, label: page.label }))
      });
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/games") {
      const countryCode = String(requestUrl.searchParams.get("country") || "CN").toUpperCase();
      if (!COUNTRIES[countryCode]) {
        jsonResponse(res, 400, { error: "不支持的国家" });
        return;
      }
      jsonResponse(res, 200, staticDeveloperGames(countryCode));
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/image-data") {
      const imageUrl = requestUrl.searchParams.get("url") || "";
      try {
        const dataUrl = await fetchImageDataUrl(imageUrl);
        imageDataResponse(res, 200, { dataUrl });
      } catch (error) {
        imageDataResponse(res, 400, { error: error.message || "图片转换失败" });
      }
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/export-result") {
      try {
        const body = await parseBody(req);
        const result = body.result || {};
        const filename = safeDownloadName(`${result.country || "AppExpo"}-${result.pageLabel || result.pageType || "placement"}-${result.localName || ""}`);
        const buffer = await runPythonExport({
          result,
          checkedAt: body.checkedAt || "",
          theme: body.theme === "dark" ? "dark" : "light"
        });
        res.writeHead(200, {
          "content-type": "image/png",
          "content-disposition": contentDisposition(`${filename}.png`),
          "cache-control": "no-store"
        });
        res.end(buffer);
      } catch (error) {
        jsonResponse(res, 500, { error: error.message || "导出图片失败" });
      }
      return;
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/analyze") {
      const body = await parseBody(req);
      const countries = Array.isArray(body.countries)
        ? body.countries.map((item) => String(item).toUpperCase())
        : [String(body.country || "CN").toUpperCase()];
      const pageTypes = (Array.isArray(body.pageTypes) ? body.pageTypes : ["today", "games"])
        .map((item) => String(item).toLowerCase())
        .filter((item) => PAGE_TYPES[item]);
      const gameName = cleanText(body.gameName, 120);
      const appId = body.appId ? String(body.appId) : "";
      const appIcon = body.appIcon ? String(body.appIcon) : "";
      const aliases = Array.isArray(body.aliases) ? body.aliases.map((item) => cleanText(item, 120)).filter(Boolean) : [];

      if (!gameName) {
        jsonResponse(res, 400, { error: "请先选择或输入游戏名称" });
        return;
      }
      if (!countries.length || countries.some((item) => !COUNTRIES[item])) {
        jsonResponse(res, 400, { error: "不支持的国家" });
        return;
      }
      if (!pageTypes.length) {
        jsonResponse(res, 400, { error: "请至少选择 Today 或 Games" });
        return;
      }

      const checkedAt = new Date().toISOString();
      const results = [];
      for (const countryCode of countries) {
        results.push(...await analyzeCountry(countryCode, gameName, appId, pageTypes, aliases, checkedAt, appIcon));
      }
      jsonResponse(res, 200, {
        gameName,
        appId,
        countries,
        pageTypes,
        checkedAt,
        results
      });
      return;
    }

    if (req.method === "GET") {
      staticFile(req, res);
      return;
    }

    jsonResponse(res, 405, { error: "Method not allowed" });
  } catch (error) {
    jsonResponse(res, 500, { error: error.message || "服务器错误" });
  }
});

server.listen(PORT, () => {
  console.log(`Apple Store placement analyzer running at http://localhost:${PORT}`);
});

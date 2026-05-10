const fs = require("node:fs");
const https = require("node:https");

const SOURCE_URL = "https://charts.checkonchain.com/";
const OUTPUT_PATH = "data/charts.js";

const CATEGORY_MAP = {
  pricing: "Pricing Models",
  confluence: "Cycle Signals",
  unrealised: "Profit / Loss",
  realised: "Profit / Loss",
  demand: "Capital Flows",
  adoption: "Network Activity",
  supply: "Supply Dynamics",
  mining: "Mining Metrics",
  technicals: "Technical / Volatility",
  cointime: "Cointime Economics",
  derivatives: "Derivatives",
  etf: "ETF Flows",
  capitalrotation: "Cross Asset",
  mstr: "Treasury / MSTR",
  treasury: "Treasury / MSTR",
  macro: "Macro",
  valuation: "Valuation",
};

const TITLE_FIXES = {
  "btconchain/demand/inflowcomparison_2015-01-01/inflowcomparison_2015-01-01_light.html":
    "Inflow Comparison 2015",
  "btconchain/demand/inflowcomparison_2024-01-01/inflowcomparison_2024-01-01_light.html":
    "Inflow Comparison 2024",
  "btconchain/pricing/price_infadj_1/price_infadj_1_light.html": "Inflation Adjusted Price 2010",
  "btconchain/pricing/price_infadj_2/price_infadj_2_light.html": "Inflation Adjusted Price 2020",
  "btconchain/pricing/pricing_price_fibs_2019/pricing_price_fibs_2019_light.html":
    "Fibonacci Key Levels 2019",
  "btconchain/pricing/pricing_price_fibs_2021_rally/pricing_price_fibs_2021_rally_light.html":
    "Fibonacci Key Levels 2021 Rally",
  "btconchain/pricing/pricing_price_fibs_2022_bear/pricing_price_fibs_2022_bear_light.html":
    "Fibonacci Key Levels 2022 Bear",
};

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Request failed: ${response.statusCode} ${response.statusMessage}`));
          response.resume();
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });
}

function decodeHtml(value) {
  return value
    .replace(/&raquo;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHref(href) {
  const last = href
    .split("/")
    .pop()
    .replace(/_light\.html$/, "")
    .replace(/\.html$/, "");

  return last
    .replace(/^(pricing|capitalrotation|confluence|histogram|mvrv|sopr|sth|lth|etf|ibit|mstr)_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/Btc/g, "BTC")
    .replace(/Usd/g, "USD")
    .replace(/Mvrv/g, "MVRV")
    .replace(/Nupl/g, "NUPL")
    .replace(/Sopr/g, "SOPR")
    .replace(/Nvt/g, "NVT")
    .replace(/Aviv/g, "AVIV")
    .replace(/Lth/g, "LTH")
    .replace(/Sth/g, "STH")
    .replace(/Etf/g, "ETF")
    .replace(/Ibit/g, "IBIT")
    .replace(/Mstr/g, "MSTR");
}

function isGenericTitle(title) {
  return /^(view chart!?|signal|metric|hist|histogram|z-score|quantiles|btc|usd|market|dominance|prices?|today|now|d|w|m|1d|1w|1m|1q|2q|3q|4q|1y\+?|\d{4})$/i.test(
    title.replace(/!$/, ""),
  );
}

function parseCharts(html) {
  const rows = [];
  const linkPattern = /<a\b[^>]*href="([^"]+_light\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html))) {
    const href = match[1];
    if (!href.startsWith("btconchain/")) continue;

    const rawTitle = decodeHtml(match[2]).replace(/ »$/, "");
    rows.push({
      href,
      title: isGenericTitle(rawTitle) || !rawTitle ? titleFromHref(href) : rawTitle,
    });
  }

  const byHref = new Map();
  for (const row of rows) {
    const existing = byHref.get(row.href);
    if (!existing || existing.title.length < row.title.length || isGenericTitle(existing.title)) {
      byHref.set(row.href, row);
    }
  }

  return [...byHref.values()]
    .map((row, index) => {
      const parts = row.href.split("/");
      const family = parts[1] || "bitcoin";
      const slug = parts.at(-2) || parts.at(-1).replace("_light.html", "");
      const title = TITLE_FIXES[row.href] || row.title;

      return {
        id: `${slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${index}`,
        title,
        category: CATEGORY_MAP[family] || family.replace(/\b\w/g, (char) => char.toUpperCase()),
        family,
        url: SOURCE_URL + row.href,
        sourcePath: row.href,
        keywords: [title, family, slug.replace(/_/g, " ")].join(" ").toLowerCase(),
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
}

async function main() {
  const html = await fetchText(SOURCE_URL);
  const charts = parseCharts(html);

  if (charts.length < 100) {
    throw new Error(`Parsed only ${charts.length} charts; refusing to overwrite ${OUTPUT_PATH}.`);
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `window.CHECKONCHAIN_CHARTS = ${JSON.stringify(charts, null, 2)};\n`);

  const categories = new Set(charts.map((chart) => chart.category));
  console.log(`Generated ${charts.length} charts across ${categories.size} categories.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// Dashboard-API Worker backing a power-utility customer portal (Workers + D1 + KV + Durable Objects).
// Eval fixture for the performance-audit skill (illustrative; NOT deployed — lives under test-fixtures/).
// Answer key in expected-findings.md — assessor-only; do not read it when auditing this fixture.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("account");

    const hits = Number((await env.KV.get("hits:" + accountId)) || 0) + 1;
    await env.KV.put("hits:" + accountId, String(hits));

    const config = await env.KV.get("config", "json");
    const account = await env.DB.prepare("SELECT * FROM accounts WHERE id = ?")
      .bind(accountId)
      .all();
    const weather = await fetch("https://weather.example/api?account=" + accountId);

    const meterIds = url.searchParams.get("meters").split(",");
    const readings = [];
    for (const meterId of meterIds) {
      const r = await env.DB.prepare("SELECT * FROM readings WHERE meter_id = ?")
        .bind(meterId)
        .all();
      readings.push(r.results[0]);
    }

    const allInvoices = await env.DB.prepare("SELECT * FROM invoices").all();
    const invoices = allInvoices.results.filter((i) => i.account_id === accountId);

    const unique = [];
    for (const r of readings) {
      if (!unique.some((u) => u.meter_id === r.meter_id)) unique.push(r);
    }

    const primary = await env.DB.prepare("SELECT tariff_id FROM accounts WHERE id = ?")
      .bind(accountId)
      .all();
    const tariff = await env.DB.prepare("SELECT * FROM tariffs WHERE id = ?")
      .bind(primary.results[0].tariff_id)
      .all();

    const enrich = await fetch("https://enrich.example/account/" + accountId);

    const cache = caches.default;
    const cacheKey = new Request(url.toString() + "&t=" + Date.now());
    let page = await cache.match(cacheKey);
    if (!page) {
      page = new Response(renderDashboard(account, readings, invoices, weather, enrich, tariff));
      ctx.waitUntil(cache.put(cacheKey, page.clone()));
    }

    await fetch("https://analytics.example/track", {
      method: "POST",
      body: JSON.stringify({ accountId, hits }),
    });

    const limit = 100;
    if (hits > limit + 1) {
      return new Response("rate limited", { status: 429 });
    }

    return page;
  },
};

function renderDashboard() {
  // stand-in for an expensive render
  return "<html>…</html>";
}

export class RateLimiter {
  constructor(state) {
    this.state = state;
  }
  async fetch() {
    let count = (await this.state.storage.get("count")) || 0;
    count++;
    await this.state.storage.put("count", count);
    return new Response(String(count));
  }
}

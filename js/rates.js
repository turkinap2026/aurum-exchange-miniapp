/* ============================================================
   Live rates.
   Crypto → USD: CoinGecko public API (no key).
   Fiat per USD: open.er-api.com (no key, daily updates).
   Falls back to APP_CONFIG.fallback when a source is unreachable.
   ============================================================ */
(function () {
  const C = window.APP_CONFIG;

  const withTimeout = (url, ms = 8000) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(() => clearTimeout(id));
  };

  const Rates = {
    crypto: { ...C.fallback.crypto },   // code → USD price
    fiat: { ...C.fallback.fiat },       // code → units per 1 USD
    change: {},                         // crypto code → 24h change, %
    live: { crypto: false, fiat: false },
    updatedAt: null,

    async refresh() {
      const ids = C.crypto.map((a) => a.cg).join(',');
      const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const fxUrl = 'https://open.er-api.com/v6/latest/USD';

      const [cg, fx] = await Promise.allSettled([withTimeout(cgUrl), withTimeout(fxUrl)]);

      if (cg.status === 'fulfilled' && cg.value) {
        let ok = 0;
        C.crypto.forEach((a) => {
          const row = cg.value[a.cg];
          if (row && typeof row.usd === 'number' && row.usd > 0) {
            this.crypto[a.code] = row.usd;
            if (typeof row.usd_24h_change === 'number') this.change[a.code] = row.usd_24h_change;
            ok++;
          }
        });
        this.live.crypto = ok > 0;
      }

      if (fx.status === 'fulfilled' && fx.value && fx.value.rates) {
        let ok = 0;
        C.fiat.forEach((f) => {
          const v = fx.value.rates[f.code];
          if (typeof v === 'number' && v > 0) { this.fiat[f.code] = v; ok++; }
        });
        this.live.fiat = ok > 0;
      }

      this.updatedAt = new Date();
      return this.isLive();
    },

    isLive() { return this.live.crypto && this.live.fiat; },

    /** Price of one unit of `code` in USD. */
    usd(code) {
      if (code in this.crypto) return this.crypto[code];
      if (code in this.fiat) return 1 / this.fiat[code];
      return NaN;
    },

    /** Market rate: how many `to` for one `from`. */
    market(from, to) { return this.usd(from) / this.usd(to); },

    /** Client rate after service fee: how many `to` the client receives for one `from`. */
    client(from, to) { return this.market(from, to) * (1 - C.marginPercent / 100); },
  };

  window.Rates = Rates;
})();

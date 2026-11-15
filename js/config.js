/* ============================================================
   App configuration — the only file to edit for branding,
   operator, fee, currencies, payment methods and banks.
   ============================================================ */
window.APP_CONFIG = {
  brand: {
    name: 'Aurum Exchange',   // temporary name — replace when the client decides
    orderPrefix: 'AU',        // order numbers look like AU-48213
  },

  // Telegram username of the operator, without "@".
  // Orders open a chat with this account with the order text pre-filled.
  operator: 'losmanzanosfloreceran',

  // Language of the order text the operator receives.
  orderLang: 'en',

  // Service fee in percent, applied on top of the market rate.
  marginPercent: 1.5,

  // Minimum order, in USD equivalent.
  minOrderUsd: 50,

  // How often live rates refresh, in seconds.
  refreshSec: 60,

  // Default pair on open.
  defaultGive: 'USDT',
  defaultGet: 'RUB',

  // Crypto assets. `cg` = CoinGecko id, `dp` = decimals shown.
  crypto: [
    { code: 'USDT', name: 'Tether',   cg: 'tether',           dp: 2, glyph: '₮', color: '#26A17B', networks: ['TRC20', 'ERC20', 'TON', 'BEP20'] },
    { code: 'BTC',  name: 'Bitcoin',  cg: 'bitcoin',          dp: 6, glyph: '₿', color: '#F7931A', networks: ['Bitcoin'] },
    { code: 'ETH',  name: 'Ethereum', cg: 'ethereum',         dp: 5, glyph: 'Ξ', color: '#627EEA', networks: ['ERC20', 'Arbitrum', 'Base'] },
    { code: 'TON',  name: 'Toncoin',  cg: 'the-open-network', dp: 3, glyph: '◆', color: '#0098EA', networks: ['TON'] },
    { code: 'TRX',  name: 'TRON',     cg: 'tron',             dp: 2, glyph: 'T', color: '#EB0029', networks: ['TRC20'] },
    { code: 'LTC',  name: 'Litecoin', cg: 'litecoin',         dp: 4, glyph: 'Ł', color: '#345D9D', networks: ['Litecoin'] },
    { code: 'SOL',  name: 'Solana',   cg: 'solana',           dp: 4, glyph: '◎', color: '#9945FF', networks: ['Solana'] },
  ],

  // Fiat currencies. `methods` — available transfer types, `banks` — shown as choices.
  // Method ids: card, phone, qr, sepa, iban
  fiat: [
    { code: 'RUB', name: 'Russian ruble',     symbol: '₽',  dp: 2, methods: ['card', 'phone', 'qr'],  banks: ['Sberbank', 'T-Bank', 'Alfa-Bank', 'VTB', 'Raiffeisen', 'Ozon Bank'] },
    { code: 'KZT', name: 'Kazakh tenge',      symbol: '₸',  dp: 0, methods: ['card', 'phone', 'qr'],  banks: ['Kaspi', 'Halyk', 'Freedom', 'Jusan', 'BCC', 'Forte'] },
    { code: 'EUR', name: 'Euro',              symbol: '€',  dp: 2, methods: ['sepa', 'iban', 'card'], banks: ['Revolut', 'Wise', 'N26', 'Bunq'] },
    { code: 'USD', name: 'US dollar',         symbol: '$',  dp: 2, methods: ['iban', 'card'],         banks: ['Wise', 'Revolut', 'Payoneer'] },
    { code: 'UAH', name: 'Ukrainian hryvnia', symbol: '₴',  dp: 2, methods: ['card', 'iban'],         banks: ['Monobank', 'PrivatBank', 'PUMB', 'A-Bank'] },
    { code: 'TRY', name: 'Turkish lira',      symbol: '₺',  dp: 2, methods: ['iban', 'card'],         banks: ['Ziraat', 'Garanti BBVA', 'İş Bankası', 'Akbank', 'Papara'] },
    { code: 'AED', name: 'UAE dirham',        symbol: 'د.إ', dp: 2, methods: ['iban', 'card'],        banks: ['Emirates NBD', 'ADCB', 'Mashreq', 'Wio'] },
    { code: 'GBP', name: 'British pound',     symbol: '£',  dp: 2, methods: ['iban', 'card'],         banks: ['Revolut', 'Monzo', 'Wise', 'Barclays'] },
    { code: 'PLN', name: 'Polish złoty',      symbol: 'zł', dp: 2, methods: ['phone', 'iban', 'card'], banks: ['PKO BP', 'mBank', 'Pekao', 'Revolut'] },
    { code: 'GEL', name: 'Georgian lari',     symbol: '₾',  dp: 2, methods: ['iban', 'card'],         banks: ['TBC Bank', 'Bank of Georgia', 'Liberty'] },
    { code: 'UZS', name: 'Uzbek som',         symbol: 'soʻm', dp: 0, methods: ['card', 'phone'],      banks: ['Uzcard', 'Humo', 'Kapitalbank', 'TBC UZ'] },
    { code: 'BYN', name: 'Belarusian ruble',  symbol: 'Br', dp: 2, methods: ['card'],                 banks: ['Belarusbank', 'Priorbank', 'Alfa-Bank BY'] },
  ],

  // Used only if live rates cannot be loaded. Crypto: price in USD. Fiat: units per 1 USD.
  fallback: {
    crypto: { USDT: 1, BTC: 95000, ETH: 3400, TON: 3.1, TRX: 0.27, LTC: 95, SOL: 180 },
    fiat:   { USD: 1, RUB: 82, KZT: 515, EUR: 0.87, UAH: 41.8, TRY: 42, AED: 3.6725, GBP: 0.77, PLN: 3.7, GEL: 2.7, UZS: 12100, BYN: 3.0 },
  },
};

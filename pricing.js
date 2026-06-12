/* ═══════════════════════════════════════════════════════════
   MYFOOTCV — PRICING ENGINE
   Détection géographique + tiers tarifaires
   ═══════════════════════════════════════════════════════════ */

(function(){
  // Pays par tier (selon pouvoir d'achat)
  const TIER_1 = ["FR","DE","IT","ES","BE","NL","LU","AT","IE","FI","DK","SE","NO","CH","PT","GR","UK","GB","IE","US","CA","AU","NZ","JP","KR","SG","HK","IL","AE","QA","KW","BH","SA"];
  const TIER_3 = ["CM","SN","CI","GH","NG","TG","BJ","BF","ML","NE","TD","CG","CD","CF","GA","GQ","RW","BI","TZ","KE","UG","ET","MG","MZ","ZW","ZM","ML","DZ","TN","MA","EG","SD","SS","SO","ER","DJ","KM","MR","GW","GN","SL","LR","CV","ST","AO","NA","BW","LS","SZ","MW","BD","PK","NP","LK","KH","LA","MM","AF","YE"];

  // Prix par tier (en cents pour précision)
  const PRICES = {
    tier1: {
      edit:  { cents: 299, display: "$2.99",  currency: "USD" },
      pro:   { cents: 999, display: "$9.99",  currency: "USD" },
      elite: { cents: 2499, display: "$24.99", currency: "USD" }
    },
    tier2: {
      edit:  { cents: 199, display: "$1.99",  currency: "USD" },
      pro:   { cents: 599, display: "$5.99",  currency: "USD" },
      elite: { cents: 1499, display: "$14.99", currency: "USD" }
    },
    tier3: {
      edit:  { cents: 99,  display: "$0.99",  currency: "USD" },
      pro:   { cents: 299, display: "$2.99",  currency: "USD" },
      elite: { cents: 799, display: "$7.99",  currency: "USD" }
    }
  };

  // Détection du tier depuis le pays (en cache localStorage)
  function detectTier(country){
    if (!country) return "tier2"; // fallback médian
    const cc = country.toUpperCase();
    if (TIER_1.includes(cc)) return "tier1";
    if (TIER_3.includes(cc)) return "tier3";
    return "tier2";
  }

  // Récupère le pays via plusieurs méthodes
  async function getCountry(){
    // 1. Cache (anti-arbitrage VPN — prix figé au 1er achat)
    const cached = localStorage.getItem("mfc:country");
    if (cached) return cached;

    // 2. Vercel header (le plus rapide, gratuit)
    try {
      const res = await fetch("/api/geo", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.country) {
          localStorage.setItem("mfc:country", data.country);
          return data.country;
        }
      }
    } catch (e) { /* fallback */ }

    // 3. Fallback Cloudflare (gratuit, sans clé)
    try {
      const res = await fetch("https://cloudflare.com/cdn-cgi/trace");
      const text = await res.text();
      const m = text.match(/loc=([A-Z]{2})/);
      if (m) {
        localStorage.setItem("mfc:country", m[1]);
        return m[1];
      }
    } catch (e) { /* ignore */ }

    // 4. Fallback navigateur (langue)
    const lang = navigator.language || "en-US";
    const cc = lang.split("-")[1] || "US";
    return cc.toUpperCase();
  }

  // API publique
  window.MyFootCVPricing = {
    async getPricing(){
      const country = await getCountry();
      const tier = detectTier(country);
      const prices = PRICES[tier];
      return {
        country,
        tier,
        currency: prices.pro.currency,
        plans: {
          free: { name: "Gratuit", display: "0", features: [
            "Créer ton CV illimité",
            "Aperçu plein écran",
            "Sauvegarde cloud"
          ]},
          edit: {
            name: "Édition unique",
            display: prices.edit.display,
            cents: prices.edit.cents,
            tagline: "Modifier ton CV une fois",
            features: [
              "1 modification de ton CV existant",
              "Idéal pour mettre à jour un transfert",
              "Anti-fraude : Nom/DOB/Nat verrouillés"
            ]
          },
          pro: {
            name: "Pro Lifetime",
            display: prices.pro.display,
            cents: prices.pro.cents,
            tagline: "Paiement unique, à vie",
            features: [
              "Export PDF HD illimité",
              "DNA Card haute résolution",
              "QR code vidéo personnalisé",
              "Édition illimitée (plus de blocage)",
              "Lien public personnalisé",
              "Suppression du watermark"
            ]
          },
          elite: {
            name: "Elite Profil",
            display: prices.elite.display,
            cents: prices.elite.cents,
            tagline: "Pro + visibilité maximale",
            features: [
              "Tout le plan Pro",
              "Badge 'Profil documenté'",
              "Statistiques de vues",
              "Apparaître dans le directory",
              "Support prioritaire",
              "Mises à jour vidéo illimitées"
            ]
          }
        }
      };
    },

    detectTier,
    PRICES
  };

  console.log("✅ MyFootCV pricing engine loaded");
})();

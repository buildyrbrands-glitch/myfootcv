/* ═══════════════════════════════════════════════════════════
   MYFOOTCV — PWA INSTALLER
   Enregistre le SW + affiche bouton "Installer l'app"
   ═══════════════════════════════════════════════════════════ */

(function(){
  // 1. Enregistrer le service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => {
          console.log("✅ Service Worker enregistré:", reg.scope);
          // Vérifier les mises à jour toutes les heures
          setInterval(() => reg.update().catch(() => {}), 3600000);
        })
        .catch((err) => console.warn("SW registration failed:", err));
    });
  }

  // 2. Variables d'état
  let deferredPrompt = null;
  let installBtn = null;
  let iosBanner = null;

  // 3. Détection plateforme
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isAndroid = /android/.test(ua);
  const isDesktop = !isIOS && !isAndroid;

  // 4. Si déjà installé, ne rien faire
  if (isStandalone) {
    console.log("✅ App déjà installée (mode standalone)");
    document.documentElement.classList.add("pwa-installed");
    return;
  }

  // 5. Styles
  const css = `
  .pwa-install-btn{
    position:fixed;bottom:18px;right:18px;z-index:9997;
    padding:12px 18px;background:linear-gradient(135deg,#1A3B7A,#2563EB);
    color:white;border:none;border-radius:30px;
    font-family:'Oswald',sans-serif;font-size:12px;font-weight:700;
    letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;
    box-shadow:0 8px 24px rgba(37,99,235,0.4);
    display:flex;align-items:center;gap:8px;
    transition:all 0.2s;animation:pwa-pop 0.5s ease;
  }
  .pwa-install-btn:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(37,99,235,0.55)}
  .pwa-install-btn .ico{font-size:18px}
  .pwa-install-btn .close{background:none;border:none;color:rgba(255,255,255,0.7);font-size:18px;margin-left:8px;cursor:pointer;padding:0 0 0 4px;border-left:1px solid rgba(255,255,255,0.2)}
  .pwa-install-btn .close:hover{color:white}

  @keyframes pwa-pop{
    from{transform:translateY(80px);opacity:0}
    to{transform:translateY(0);opacity:1}
  }

  .pwa-ios-banner{
    position:fixed;bottom:18px;left:18px;right:18px;z-index:9997;
    max-width:380px;margin:0 auto;
    background:#1f2937;border:1px solid rgba(96,165,250,0.3);border-radius:14px;
    padding:14px 16px;color:#e5e7eb;font-family:'Source Sans 3',sans-serif;
    box-shadow:0 12px 40px rgba(0,0,0,0.5);
    animation:pwa-pop 0.5s ease;
  }
  .pwa-ios-banner h4{font-family:'Oswald',sans-serif;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#fbbf24;margin-bottom:6px;display:flex;align-items:center;gap:6px}
  .pwa-ios-banner p{font-size:12.5px;color:#d1d5db;line-height:1.5;margin:0}
  .pwa-ios-banner .step{display:inline-block;padding:1px 7px;background:rgba(96,165,250,0.15);color:#60a5fa;border-radius:8px;font-size:11px;font-weight:700;font-family:'Oswald',sans-serif;margin:0 2px}
  .pwa-ios-banner .close{position:absolute;top:8px;right:10px;background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer}

  @media(max-width:520px){
    .pwa-install-btn{bottom:12px;right:12px;padding:10px 14px;font-size:11px}
  }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // 6. Capter l'événement beforeinstallprompt (Chrome/Edge/Android)
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  // 7. Quand l'app est installée
  window.addEventListener("appinstalled", () => {
    console.log("🎉 PWA installée !");
    hideInstallButton();
    hideIosBanner();
    deferredPrompt = null;
    if (window.MyFootCV && window.MyFootCV.logEvent) {
      window.MyFootCV.logEvent("PWA_INSTALLED", { ua: navigator.userAgent.slice(0, 100) });
    }
  });

  // 8. Bouton standard pour Chrome/Android/Desktop
  function showInstallButton(){
    if (installBtn) return;
    // Ne montrer qu'après 5 secondes pour ne pas être agressif
    setTimeout(() => {
      if (!deferredPrompt) return;
      // Vérifier que l'user n'a pas dismissé récemment (24h)
      const lastDismiss = parseInt(localStorage.getItem("pwa-dismiss") || "0", 10);
      if (Date.now() - lastDismiss < 86400000) return;

      installBtn = document.createElement("button");
      installBtn.className = "pwa-install-btn";
      installBtn.innerHTML = `<span class="ico">📱</span><span>Installer l'app</span><button class="close" aria-label="Fermer">×</button>`;
      installBtn.querySelector(".close").onclick = (ev) => {
        ev.stopPropagation();
        localStorage.setItem("pwa-dismiss", Date.now().toString());
        hideInstallButton();
      };
      installBtn.onclick = doInstall;
      document.body.appendChild(installBtn);
    }, 5000);
  }

  function hideInstallButton(){
    if (installBtn) { installBtn.remove(); installBtn = null; }
  }

  async function doInstall(){
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    console.log("Install choice:", choice.outcome);
    if (choice.outcome === "accepted") {
      hideInstallButton();
    }
    deferredPrompt = null;
  }

  // 9. Bannière iOS (Safari n'a pas de prompt natif)
  function showIosBanner(){
    if (iosBanner) return;
    const lastDismiss = parseInt(localStorage.getItem("pwa-ios-dismiss") || "0", 10);
    if (Date.now() - lastDismiss < 86400000 * 3) return; // 3 jours

    setTimeout(() => {
      iosBanner = document.createElement("div");
      iosBanner.className = "pwa-ios-banner";
      iosBanner.innerHTML = `
        <button class="close" aria-label="Fermer">×</button>
        <h4>📱 Installer MyFootCV sur iPhone</h4>
        <p>Touche <span class="step">⤴ Partager</span> puis <span class="step">Sur l'écran d'accueil</span> pour l'ajouter comme une app.</p>
      `;
      iosBanner.querySelector(".close").onclick = () => {
        localStorage.setItem("pwa-ios-dismiss", Date.now().toString());
        hideIosBanner();
      };
      document.body.appendChild(iosBanner);
    }, 4000);
  }

  function hideIosBanner(){
    if (iosBanner) { iosBanner.remove(); iosBanner = null; }
  }

  // 10. Activer la bannière iOS si Safari mobile
  if (isIOS && !isStandalone) {
    showIosBanner();
  }

  // 11. Exposer une fonction globale pour déclencher manuellement
  window.installApp = () => {
    if (deferredPrompt) { doInstall(); return; }
    if (isIOS) {
      alert("📱 Pour installer MyFootCV sur iPhone :\n\n1. Touche le bouton Partager ⤴️\n2. Choisis 'Sur l'écran d'accueil'\n3. Confirme avec 'Ajouter'");
      return;
    }
    if (isAndroid) {
      alert("📱 Pour installer MyFootCV sur Android :\n\n1. Ouvre le menu Chrome (⋮)\n2. Touche 'Installer l'app' ou 'Ajouter à l'écran d'accueil'");
      return;
    }
    alert("💻 Pour installer MyFootCV :\n\n1. Clique sur l'icône d'installation dans la barre d'adresse\n2. Ou utilise le menu du navigateur");
  };

  console.log("✅ PWA installer loaded — platform:", isIOS ? "iOS" : isAndroid ? "Android" : "Desktop");
})();

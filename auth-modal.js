/* ═══════════════════════════════════════════════════════════
   MYFOOTCV — AUTH MODAL
   Injecte un bouton login/signup + modal sur n'importe quelle page
   Dépend de supabase-client.js (window.MyFootCV)
   ═══════════════════════════════════════════════════════════ */

(async function(){
  // Attendre que MyFootCV soit prêt
  let tries = 0;
  while (!window.MyFootCV && tries < 30) {
    await new Promise(r => setTimeout(r, 150));
    tries++;
  }
  if (!window.MyFootCV) {
    console.warn("auth-modal.js: MyFootCV not available");
    return;
  }

  const MFC = window.MyFootCV;

  // ─── Inject CSS ────────────────────────────────────────────
  const css = `
  .mfc-auth-btn{position:fixed;top:14px;right:80px;z-index:9998;padding:8px 14px;background:rgba(37,99,235,0.92);color:white;border:1px solid rgba(96,165,250,0.4);border-radius:18px;font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 4px 16px rgba(0,0,0,0.3);transition:all 0.15s}
  .mfc-auth-btn:hover{background:rgba(37,99,235,1);transform:translateY(-1px)}
  .mfc-auth-btn.logged{background:rgba(5,150,105,0.88);border-color:rgba(52,211,153,0.4)}
  .mfc-auth-btn.logged:hover{background:rgba(5,150,105,1)}

  .mfc-auth-overlay{position:fixed;inset:0;background:rgba(2,6,15,0.85);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;padding:18px}
  .mfc-auth-overlay.open{display:flex}
  .mfc-auth-modal{background:#0f1a30;border:1px solid rgba(96,165,250,0.18);border-radius:14px;padding:28px;max-width:380px;width:100%;color:#e5e7eb;box-shadow:0 30px 80px rgba(0,0,0,0.7);position:relative;font-family:'Source Sans 3',sans-serif}
  .mfc-auth-close{position:absolute;top:12px;right:14px;background:none;border:none;color:#9ca3af;font-size:24px;cursor:pointer;line-height:1}
  .mfc-auth-close:hover{color:white}
  .mfc-auth-logo{width:54px;height:auto;display:block;margin:0 auto 10px}
  .mfc-auth-h{font-family:'Oswald',sans-serif;font-size:22px;letter-spacing:1.5px;text-align:center;text-transform:uppercase;margin-bottom:6px;color:white}
  .mfc-auth-sub{font-size:12.5px;color:#9ca3af;text-align:center;margin-bottom:18px}

  .mfc-auth-tabs{display:flex;gap:0;margin-bottom:18px;border:1px solid rgba(255,255,255,0.06);border-radius:9px;padding:4px;background:rgba(0,0,0,0.25)}
  .mfc-auth-tab{flex:1;padding:9px;background:none;border:none;color:#9ca3af;font-family:'Oswald',sans-serif;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;cursor:pointer;border-radius:6px;transition:all 0.15s}
  .mfc-auth-tab.active{background:#3b82f6;color:white}

  .mfc-auth-field{margin-bottom:11px}
  .mfc-auth-field input{width:100%;padding:11px 13px;background:#1a253d;border:1px solid #2a3759;border-radius:8px;color:white;font-size:13.5px;font-family:'Source Sans 3',sans-serif}
  .mfc-auth-field input:focus{outline:none;border-color:#3b82f6;background:#1d2944}
  .mfc-auth-field input::placeholder{color:#6b7280}

  .mfc-auth-submit{width:100%;padding:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);border:none;border-radius:8px;color:white;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;margin-top:6px;transition:all 0.15s}
  .mfc-auth-submit:hover{filter:brightness(1.15);transform:translateY(-1px)}
  .mfc-auth-submit:disabled{opacity:0.6;cursor:wait;transform:none}

  .mfc-auth-divider{text-align:center;font-size:10.5px;color:#6b7280;margin:14px 0;text-transform:uppercase;letter-spacing:2px;display:flex;align-items:center;gap:10px}
  .mfc-auth-divider::before,.mfc-auth-divider::after{content:"";flex:1;height:1px;background:rgba(255,255,255,0.07)}

  .mfc-auth-magic{width:100%;padding:11px;background:none;border:1px solid #374151;border-radius:8px;color:#9ca3af;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all 0.15s}
  .mfc-auth-magic:hover{border-color:#60a5fa;color:white}

  .mfc-auth-msg{font-size:12.5px;text-align:center;margin-top:10px;min-height:18px;line-height:1.4}
  .mfc-auth-msg.err{color:#f87171}
  .mfc-auth-msg.ok{color:#34d399}

  .mfc-auth-foot{margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#6b7280;text-align:center;line-height:1.55}
  .mfc-auth-foot a{color:#60a5fa;text-decoration:none}
  .mfc-auth-foot a:hover{text-decoration:underline}

  .mfc-auth-profile{padding:8px 0}
  .mfc-auth-profile .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px}
  .mfc-auth-profile .row b{color:#9ca3af;font-weight:600;font-family:'Oswald',sans-serif;text-transform:uppercase;font-size:10.5px;letter-spacing:1.2px}
  .mfc-auth-profile .row span{color:white}
  .mfc-auth-profile .badge{display:inline-block;padding:2px 8px;border-radius:10px;background:rgba(251,191,36,0.15);color:#fbbf24;font-size:10px;font-weight:700;font-family:'Oswald',sans-serif;letter-spacing:1px;text-transform:uppercase}
  .mfc-auth-profile .badge.green{background:rgba(52,211,153,0.15);color:#34d399}
  .mfc-auth-logout{width:100%;margin-top:14px;padding:10px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);border-radius:7px;color:#f87171;font-family:'Oswald',sans-serif;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;cursor:pointer}
  .mfc-auth-logout:hover{background:rgba(248,113,113,0.2)}

  @media(max-width:520px){
    .mfc-auth-btn{top:10px;right:70px;padding:6px 11px;font-size:10px}
  }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ─── Build button ─────────────────────────────────────────
  const btn = document.createElement("button");
  btn.className = "mfc-auth-btn";
  btn.textContent = "🔐 Connexion";
  btn.onclick = openModal;
  document.body.appendChild(btn);

  // ─── Build modal ─────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.className = "mfc-auth-overlay";
  overlay.innerHTML = `
    <div class="mfc-auth-modal" onclick="event.stopPropagation()">
      <button class="mfc-auth-close" id="mfc-auth-close">×</button>
      <img src="logo.png" class="mfc-auth-logo" alt="MyFootCV"/>
      <h2 class="mfc-auth-h" id="mfc-auth-title">Connexion</h2>
      <div class="mfc-auth-sub" id="mfc-auth-subtitle">Connecte-toi pour sauvegarder ton CV en cloud</div>

      <div id="mfc-auth-body">
        <div class="mfc-auth-tabs">
          <button class="mfc-auth-tab active" data-tab="login">Connexion</button>
          <button class="mfc-auth-tab" data-tab="signup">Inscription</button>
        </div>

        <div id="mfc-auth-form-login">
          <div class="mfc-auth-field"><input type="email" id="mfc-login-email" placeholder="Email" autocomplete="email"/></div>
          <div class="mfc-auth-field"><input type="password" id="mfc-login-pwd" placeholder="Mot de passe" autocomplete="current-password"/></div>
          <button class="mfc-auth-submit" id="mfc-login-btn">Se connecter</button>
          <div class="mfc-auth-divider">ou</div>
          <button class="mfc-auth-magic" id="mfc-login-magic">📧 Recevoir un lien magique par email</button>
        </div>

        <div id="mfc-auth-form-signup" style="display:none">
          <div class="mfc-auth-field"><input type="text" id="mfc-signup-name" placeholder="Nom d'affichage (optionnel)" autocomplete="name"/></div>
          <div class="mfc-auth-field"><input type="email" id="mfc-signup-email" placeholder="Email" autocomplete="email"/></div>
          <div class="mfc-auth-field"><input type="password" id="mfc-signup-pwd" placeholder="Mot de passe (min 6 caractères)" autocomplete="new-password" minlength="6"/></div>
          <div class="mfc-auth-field"><input type="text" id="mfc-signup-ref" placeholder="Code parrain (optionnel)"/></div>
          <button class="mfc-auth-submit" id="mfc-signup-btn">Créer mon compte</button>
        </div>

        <div class="mfc-auth-msg" id="mfc-auth-msg"></div>

        <div class="mfc-auth-foot">
          En continuant, tu acceptes nos<br/>
          <a href="terms.html" target="_blank">CGU</a> · <a href="privacy.html" target="_blank">Politique de confidentialité</a>
        </div>
      </div>

      <div id="mfc-auth-profile-view" style="display:none">
        <div class="mfc-auth-profile" id="mfc-auth-profile-rows"></div>
        <button class="mfc-auth-logout" id="mfc-auth-logout-btn">🚪 Se déconnecter</button>
      </div>
    </div>
  `;
  overlay.onclick = closeModal;
  document.body.appendChild(overlay);

  // ─── Logic ───────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const msg = (txt, type) => {
    const m = $("mfc-auth-msg");
    m.textContent = txt;
    m.className = "mfc-auth-msg " + (type || "");
  };

  function openModal(){
    overlay.classList.add("open");
    msg("", "");
    refreshState();
  }
  function closeModal(){ overlay.classList.remove("open"); }
  $("mfc-auth-close").onclick = closeModal;

  // Tabs switching
  document.querySelectorAll(".mfc-auth-tab").forEach(t => {
    t.onclick = () => {
      document.querySelectorAll(".mfc-auth-tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      const tab = t.dataset.tab;
      $("mfc-auth-form-login").style.display = tab === "login" ? "block" : "none";
      $("mfc-auth-form-signup").style.display = tab === "signup" ? "block" : "none";
      msg("", "");
    };
  });

  // Login
  $("mfc-login-btn").onclick = async () => {
    const email = $("mfc-login-email").value.trim();
    const pwd = $("mfc-login-pwd").value;
    if (!email || !pwd) { msg("Email et mot de passe requis", "err"); return; }
    $("mfc-login-btn").disabled = true;
    msg("Connexion en cours...", "");
    const r = await MFC.signIn(email, pwd);
    $("mfc-login-btn").disabled = false;
    if (!r.ok) { msg(r.error, "err"); return; }
    msg("✅ Connecté !", "ok");
    setTimeout(() => { refreshButton(); closeModal(); }, 600);
  };

  // Magic link
  $("mfc-login-magic").onclick = async () => {
    const email = $("mfc-login-email").value.trim();
    if (!email) { msg("Renseigne ton email d'abord", "err"); return; }
    $("mfc-login-magic").disabled = true;
    msg("Envoi du lien...", "");
    const r = await MFC.signInMagicLink(email);
    $("mfc-login-magic").disabled = false;
    msg(r.ok ? r.message : r.error, r.ok ? "ok" : "err");
  };

  // Signup
  $("mfc-signup-btn").onclick = async () => {
    const name = $("mfc-signup-name").value.trim();
    const email = $("mfc-signup-email").value.trim();
    const pwd = $("mfc-signup-pwd").value;
    if (!email || pwd.length < 6) { msg("Email + mot de passe (6 caractères min)", "err"); return; }
    $("mfc-signup-btn").disabled = true;
    msg("Création du compte...", "");
    const r = await MFC.signUp(email, pwd, name);
    $("mfc-signup-btn").disabled = false;
    if (!r.ok) { msg(r.error, "err"); return; }
    msg("✅ Compte créé ! Vérifie tes emails pour confirmer.", "ok");
    // Try auto-login
    setTimeout(async () => {
      const lr = await MFC.signIn(email, pwd);
      if (lr.ok) { refreshButton(); closeModal(); }
    }, 800);
  };

  // Logout
  $("mfc-auth-logout-btn").onclick = async () => {
    await MFC.signOut();
    refreshButton();
    closeModal();
  };

  async function refreshState(){
    const user = await MFC.getCurrentUser();
    const body = $("mfc-auth-body");
    const profile = $("mfc-auth-profile-view");
    const rows = $("mfc-auth-profile-rows");
    if (user && user.profile) {
      body.style.display = "none";
      profile.style.display = "block";
      $("mfc-auth-title").textContent = "Mon profil";
      $("mfc-auth-subtitle").textContent = "Tes infos MyFootCV";
      const isAdmin = user.profile.role === "super_admin" || user.profile.role === "admin";
      rows.innerHTML = `
        <div class="row"><b>Email</b><span>${user.email}</span></div>
        <div class="row"><b>Nom</b><span>${user.profile.display_name || "—"}</span></div>
        <div class="row"><b>Rôle</b><span class="badge ${isAdmin?'green':''}">${user.profile.role}</span></div>
        <div class="row"><b>Code parrain</b><span style="font-family:monospace;letter-spacing:1.5px">${user.profile.referral_code}</span></div>
        <div class="row"><b>Gains parrain</b><span>$${((user.profile.total_earnings_cents||0)/100).toFixed(2)}</span></div>
        ${isAdmin ? `<div class="row"><b>Dashboard</b><span><a href="admin.html" style="color:#fbbf24">→ Admin panel</a></span></div>` : ""}
      `;
    } else {
      body.style.display = "block";
      profile.style.display = "none";
      $("mfc-auth-title").textContent = "Connexion";
      $("mfc-auth-subtitle").textContent = "Connecte-toi pour sauvegarder ton CV en cloud";
    }
  }

  async function refreshButton(){
    const user = await MFC.getCurrentUser();
    if (user && user.profile) {
      btn.textContent = "👤 " + (user.profile.display_name || user.email).slice(0, 20);
      btn.classList.add("logged");
    } else {
      btn.textContent = "🔐 Connexion";
      btn.classList.remove("logged");
    }
  }

  // Listen to auth changes
  MFC.onAuthChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
      refreshButton();
    }
  });

  refreshButton();

  // Expose globally for debugging
  window._mfcAuth = { open: openModal, close: closeModal, refresh: refreshButton };
  console.log("✅ MyFootCV auth modal loaded");
})();

/*
 * Toast « action terminée » commun à tous les modules du CHU (27/11/2026).
 * Après chaque requête d'écriture réussie (POST, PUT, PATCH, DELETE) vers les
 * services du CHU, un court message confirme l'action — sauf si la page a déjà
 * affiché sa propre confirmation, ou s'il s'agit d'une action technique
 * (lecture de notification, messagerie, brouillon, sauvegarde automatique...).
 */
(function () {
  if (typeof window === 'undefined' || window.__chuToast) return;
  window.__chuToast = true;

  var IGNORES = /notification|messagerie|socket\.io|\/auth\/|login|logout|refresh|token|marquer|consulter|consultee|\/lu\b|\/read|lues|brouillon|draft|heartbeat|presence|\/logs?\b|audit|tracking|\/search|recherche|\/stats|accuser|vu\b|_next|hot-update|sentry/i;
  var dernier = {};

  function libelle(methode) {
    if (methode === 'DELETE') return 'Suppression effectuée';
    if (methode === 'POST') return 'Enregistrement effectué';
    return 'Modifications enregistrées';
  }

  // La page vient-elle d'afficher SA propre confirmation ? Seuls les messages
  // apparus depuis peu comptent : un bandeau permanent (alarme de surveillance,
  // zone « aria-live » du site) ne doit pas faire taire le toast.
  var SEL = '[role="status"],[role="alert"],[data-sonner-toast],.Toastify__toast,[class*="toast" i],[class*="Toast"],[class*="snackbar" i]';
  var dernierMessagePage = 0;
  function estMessage(n) {
    return n && n.nodeType === 1 && n.id !== 'chu-toast' && !(n.closest && n.closest('#chu-toast')) &&
      ((n.matches && n.matches(SEL)) || (n.querySelector && n.querySelector(SEL)));
  }
  function surveiller() {
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var m = muts[i];
          for (var j = 0; j < m.addedNodes.length; j++) {
            if (estMessage(m.addedNodes[j])) { dernierMessagePage = Date.now(); return; }
          }
          var t = m.target && (m.target.nodeType === 1 ? m.target : m.target.parentElement);
          if (t && t.closest && !t.closest('#chu-toast') && t.closest(SEL) && (t.textContent || '').trim()) { dernierMessagePage = Date.now(); return; }
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (e) { /* navigateur ancien : toast toujours affiché */ }
  }
  surveiller();
  function dejaConfirme(depuis) {
    return dernierMessagePage >= depuis - 200;
  }

  function afficher(texte) {
    var boite = document.getElementById('chu-toast');
    if (!boite) {
      boite = document.createElement('div');
      boite.id = 'chu-toast';
      boite.setAttribute('aria-hidden', 'true');
      boite.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);z-index:2147483000;' +
        'display:flex;align-items:center;gap:10px;padding:11px 18px;border-radius:12px;background:#0F5132;color:#fff;' +
        'font:600 14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.22);' +
        'opacity:0;transition:opacity .2s ease,transform .2s ease;pointer-events:none;max-width:90vw';
      document.body.appendChild(boite);
    }
    boite.innerHTML = '<span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:#22C55E;align-items:center;justify-content:center;font-size:13px">✓</span><span></span>';
    boite.lastChild.textContent = texte;
    boite.style.opacity = '1';
    boite.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(boite._t);
    boite._t = setTimeout(function () {
      boite.style.opacity = '0';
      boite.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2600);
  }

  function signaler(methode, url, statut) {
    methode = String(methode || 'GET').toUpperCase();
    if (methode === 'GET' || methode === 'HEAD' || methode === 'OPTIONS') return;
    if (!(statut >= 200 && statut < 300)) return;
    var u = String(url || '');
    if (IGNORES.test(u)) return;
    // Même ressource modifiée en rafale (sauvegarde automatique) : un seul toast.
    var cle = methode + ' ' + u.split('?')[0].replace(/[0-9a-f-]{8,}|\d+/gi, '#');
    var maintenant = Date.now();
    if (dernier[cle] && maintenant - dernier[cle] < 8000) { dernier[cle] = maintenant; return; }
    dernier[cle] = maintenant;
    setTimeout(function () {
      if (!dejaConfirme(maintenant)) afficher(libelle(methode));
    }, 450);
  }

  // fetch
  var fetchOrigine = window.fetch;
  if (fetchOrigine) {
    window.fetch = function (entree, options) {
      var methode = (options && options.method) || (entree && entree.method) || 'GET';
      var url = typeof entree === 'string' ? entree : (entree && entree.url) || '';
      return fetchOrigine.apply(this, arguments).then(function (rep) {
        try { signaler(methode, url, rep.status); } catch (e) { /* jamais bloquant */ }
        return rep;
      });
    };
  }

  // XMLHttpRequest (axios)
  var ouvrir = XMLHttpRequest.prototype.open;
  var envoyer = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (methode, url) {
    this.__chu = { m: methode, u: url };
    return ouvrir.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    xhr.addEventListener('loadend', function () {
      try { if (xhr.__chu) signaler(xhr.__chu.m, xhr.__chu.u, xhr.status); } catch (e) { /* jamais bloquant */ }
    });
    return envoyer.apply(this, arguments);
  };
})();

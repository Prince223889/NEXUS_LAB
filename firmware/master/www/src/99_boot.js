/* Démarrage de l'application une fois le DOM prêt. */
(function () {
  'use strict';
  const start = () => window.APP.boot().catch((e) => {
    console.error(e);
    document.getElementById('app').innerHTML = '<p style="padding:24px;font-family:system-ui">Erreur au démarrage de l\'interface : ' + String(e && e.message || e) + '</p>';
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

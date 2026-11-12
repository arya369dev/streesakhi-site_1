/* Google Analytics 4: paste your Measurement ID (G-XXXXXXX) below once, or leave empty to turn it off. */
(function () {
  var GA_ID = "";
  if (!GA_ID) return;
  var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID; document.head.appendChild(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date()); gtag("config", GA_ID);
})();

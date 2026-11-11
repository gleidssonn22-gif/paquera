const AD_CONSENT_KEY = 'paquera_ad_consent';
const adConfig = window.PAQUERA_ADS_CONFIG || {};
let adsInitialized = false;

function hasAdConfiguration() {
  const google = adConfig.google || {};
  const slots = google.slots || {};
  const hasGoogle = /^ca-pub-\d+$/.test(google.publisherId || '') &&
    Object.values(slots).some(slotId => /^\d+$/.test(slotId || ''));
  const monetag = adConfig.monetag || {};
  return hasGoogle || Boolean(monetag.scriptUrl && (monetag.containerId || monetag.zone));
}

function initMonetization() {
  const consent = localStorage.getItem(AD_CONSENT_KEY);
  const banner = document.getElementById('ad-consent-banner');
  if (banner && consent === null && hasAdConfiguration()) banner.hidden = false;
  const preference = document.getElementById('allow-ad-partners');
  if (preference) preference.checked = consent === 'accepted';
  if (consent === 'accepted') activateAds();
}

function openAdSettings() {
  const preference = document.getElementById('allow-ad-partners');
  if (preference) preference.checked = localStorage.getItem(AD_CONSENT_KEY) === 'accepted';
  document.getElementById('ad-settings-dialog').showModal();
}

function acceptAdConsent() {
  saveAdConsent(true);
}

function rejectAdConsent() {
  saveAdConsent(false);
  closeDialog('ad-settings-dialog');
}

function saveAdSettings(event) {
  event.preventDefault();
  saveAdConsent(document.getElementById('allow-ad-partners').checked);
  closeDialog('ad-settings-dialog');
}

function saveAdConsent(allowed) {
  localStorage.setItem(AD_CONSENT_KEY, allowed ? 'accepted' : 'rejected');
  const banner = document.getElementById('ad-consent-banner');
  if (banner) banner.hidden = true;
  if (allowed) {
    activateAds();
  } else if (adsInitialized) {
    window.location.reload();
  }
}

function activateAds() {
  if (adsInitialized || !hasAdConfiguration()) return;
  adsInitialized = true;
  const google = adConfig.google || {};
  const monetag = adConfig.monetag || {};
  const slots = google.slots || {};
  const hasGoogle = /^ca-pub-\d+$/.test(google.publisherId || '') &&
    Object.values(slots).some(slotId => /^\d+$/.test(slotId || ''));

  if (hasGoogle) loadGoogleAds(google, slots);
  if (!hasGoogle || !slots[monetag.placement]) loadMonetagAd(monetag);
}

function loadGoogleAds(google, slots) {
  const placements = Object.entries(slots).filter(([placement, slotId]) =>
    ['landing', 'discover'].includes(placement) &&
    /^\d+$/.test(slotId || '') && document.querySelector(`[data-ad-placement="${placement}"]`)
  );
  if (!placements.length) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(google.publisherId)}`;
  script.onerror = () => {
    placements.forEach(([placement]) => hideAdPlacement(placement));
    console.error('Não foi possível carregar o script de anúncios do Google.');
  };
  document.head.appendChild(script);

  placements.forEach(([placement, slotId]) => {
    const region = document.querySelector(`[data-ad-placement="${placement}"]`);
    const content = region.querySelector('[id^="ad-"][id$="-content"]');
    if (!content) return;
    region.hidden = false;
    content.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${google.publisherId}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      hideAdPlacement(placement);
      console.error(`Não foi possível inicializar o anúncio Google em "${placement}".`, error);
    }
  });
}

function loadMonetagAd(monetag) {
  if (!monetag.scriptUrl || !(monetag.containerId || monetag.zone)) return;
  if (!['landing', 'discover'].includes(monetag.placement)) return;
  const region = document.querySelector(`[data-ad-placement="${monetag.placement}"]`);
  if (!region) return;
  if (monetag.containerId && !/^[A-Za-z][\w:-]*$/.test(monetag.containerId)) return;
  if (monetag.zone && !/^\d+$/.test(String(monetag.zone))) return;

  let scriptUrl;
  try {
    scriptUrl = new URL(monetag.scriptUrl);
  } catch (error) {
    console.error('A URL do script Monetag é inválida.', error);
    return;
  }
  if (scriptUrl.protocol !== 'https:') {
    console.error('O script Monetag precisa usar HTTPS.');
    return;
  }

  const content = region.querySelector('[id^="ad-"][id$="-content"]');
  if (!content) return;
  region.hidden = false;
  if (monetag.containerId) {
    const container = document.createElement('div');
    container.id = monetag.containerId;
    content.appendChild(container);
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = scriptUrl.href;
  // Tags no formato "tag.min.js" usam data-zone (ID da zona no painel da Monetag).
  if (monetag.zone) {
    script.dataset.zone = String(monetag.zone);
    script.setAttribute('data-cfasync', 'false');
  }
  script.onerror = () => {
    hideAdPlacement(monetag.placement);
    console.error('Não foi possível carregar o script de anúncios Monetag.');
  };
  document.head.appendChild(script);
}

function hideAdPlacement(placement) {
  const region = document.querySelector(`[data-ad-placement="${placement}"]`);
  if (region) region.hidden = true;
}

initMonetization();

const ACCENT_REGEX = /[\u0300-\u036f]/g;

const CITY_LIST = [
  'casablanca', 'rabat', 'marrakech', 'tanger', 'fes', 'agadir', 'meknes',
  'tetouan', 'oujda', 'kenitra', 'temara', 'safi', 'mohammedia', 'el jadida',
  'beni mellal', 'nador', 'errachidia', 'essaouira', 'khenifra', 'khouribga',
  'larache', 'berrechid', 'settat', 'sale'
];

const ADDRESS_KEYWORDS = [
  'adresse', 'address', 'rue', 'bd', 'boulevard', 'avenue', 'av ', 'lot',
  'immeuble', 'appartement', 'appt', 'etage', 'étage', 'residence', 'résidence',
  'quartier', 'hay', 'cite', 'cité', 'bloc', 'numéro', 'numero'
];

const AFFIRMATIVE_WORDS = [
  'oui', 'ok', 'daccord', "d'accord", 'safi', 'na3am', 'ah', 'iwa', 'yes',
  'parfait', 'cest bon', "c'est bon", 'top', 'tres bien', 'très bien'
];

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(ACCENT_REGEX, '')
    .trim();
}

function capitalizeWords(text = '') {
  return text
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function ensureSessionShape(session) {
  if (!session.customer_info) session.customer_info = {};
  if (!Array.isArray(session.cart)) session.cart = [];
}

function detectPhone(text) {
  const digitsOnly = text.replace(/[^\d+]/g, '');
  const phoneMatch = digitsOnly.match(/(?:\+?212|0)\d{8,9}/);
  if (!phoneMatch) return null;
  let phone = phoneMatch[0];
  phone = phone.replace(/^\+?212/, '0');
  return phone;
}

function detectName(segment) {
  const nameRegex = /(je m'appe(?:lle|le)|mon nom est|nom complet|ism[ai]?|ism dyali|ana ism)\s*[:\-]?\s*([a-zA-ZÀ-ÖØ-öø-ÿ' ]{3,})/i;
  const match = segment.match(nameRegex);
  if (match) {
    return capitalizeWords(match[2].trim().replace(/\s+/g, ' '));
  }

  const clean = segment.trim();
  if (/^[a-zA-ZÀ-ÖØ-öø-ÿ' ]{3,40}$/.test(clean) && clean.split(' ').length >= 2) {
    return capitalizeWords(clean);
  }

  return null;
}

function detectAddress(segment) {
  const normalized = normalize(segment);
  if (!ADDRESS_KEYWORDS.some(keyword => normalized.includes(keyword))) return null;
  if (segment.length < 6) return null;
  return segment.trim();
}

function detectCity(segment) {
  const normalized = normalize(segment);
  const found = CITY_LIST.find(city => normalized.includes(city));
  return found ? capitalizeWords(found) : null;
}

function detectDelivery(segment) {
  const normalized = normalize(segment);
  if (normalized.includes('express')) return 'express';
  if (normalized.includes('normal') || normalized.includes('standard')) return 'standard';
  return null;
}

function detectProducts(segment, catalog) {
  const matches = [];
  const normalizedSegment = normalize(segment);

  if (!Array.isArray(catalog?.products)) return matches;

  catalog.products.forEach(product => {
    if (!product?.name) return;
    const normalizedName = normalize(product.name);
    if (!normalizedName) return;

    if (normalizedSegment.includes(normalizedName)) {
      let quantity = 1;

      const qtyRegex = new RegExp(`${normalizedName}\\s*(?:x|\\*)?\\s*(\\d{1,3})`);
      const qtyMatch = normalizedSegment.match(qtyRegex);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10);
      } else {
        const numberMatch = normalizedSegment.match(/(\d{1,3})/);
        if (numberMatch) {
          quantity = parseInt(numberMatch[1], 10);
        }
      }

      matches.push({ product, quantity: Number.isFinite(quantity) ? quantity : 1 });
    }
  });

  return matches;
}

function addProductToCart(session, productId, quantity = 1) {
  if (!productId || quantity <= 0) return;
  ensureSessionShape(session);

  const existing = session.cart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    session.cart.push({
      product_id: productId,
      quantity,
      added_at: new Date().toISOString()
    });
  }
}

function isAffirmative(text) {
  const normalized = normalize(text);
  return AFFIRMATIVE_WORDS.some(word => normalized === word || normalized.includes(word));
}

function processCustomerMessage(session, catalog, text) {
  ensureSessionShape(session);
  const segments = text.split(/\n|,|;/).map(part => part.trim()).filter(Boolean);

  let infoCaptured = false;
  let cartUpdated = false;

  segments.forEach(segment => {
    const phone = !session.customer_info.phone ? detectPhone(segment) : null;
    if (phone) {
      session.customer_info.phone = phone;
      infoCaptured = true;
    }

    if (!session.customer_info.name) {
      const name = detectName(segment);
      if (name) {
        session.customer_info.name = name;
        infoCaptured = true;
      }
    }

    if (!session.customer_info.address) {
      const address = detectAddress(segment);
      if (address) {
        session.customer_info.address = address;
        infoCaptured = true;
      }
    }

    if (!session.customer_info.city) {
      const city = detectCity(segment);
      if (city) {
        session.customer_info.city = city;
        infoCaptured = true;
      }
    }

    const delivery = detectDelivery(segment);
    if (delivery) {
      session.customer_info.delivery = delivery;
      infoCaptured = true;
    }

    const productMentions = detectProducts(segment, catalog);
    if (productMentions.length > 0) {
      productMentions.forEach(({ product, quantity }) => {
        addProductToCart(session, product.id, quantity);
        session.last_suggested_product_id = product.id;
      });
      cartUpdated = true;
    }
  });

  const trimmed = text.trim();
  if (/^\d{1,3}$/.test(trimmed) && session.last_suggested_product_id) {
    addProductToCart(session, session.last_suggested_product_id, parseInt(trimmed, 10));
    cartUpdated = true;
    session.last_suggested_product_id = null;
  } else if (isAffirmative(trimmed) && session.last_suggested_product_id) {
    addProductToCart(session, session.last_suggested_product_id, 1);
    cartUpdated = true;
    session.last_suggested_product_id = null;
  }

  return { infoCaptured, cartUpdated };
}

function processBotResponse(session, response, catalog) {
  if (!response) return;
  ensureSessionShape(session);

  const productMentions = detectProducts(response, catalog);
  if (productMentions.length === 1) {
    session.last_suggested_product_id = productMentions[0].product.id;
  }
}

function getCartWithDetails(session, catalog) {
  ensureSessionShape(session);
  if (!Array.isArray(session.cart) || session.cart.length === 0) return [];

  return session.cart.map(item => {
    const product = catalog.products?.find(p => p.id === item.product_id);
    return {
      productId: item.product_id,
      name: product?.name || 'Produit',
      quantity: item.quantity || 1,
      price: product?.price || 0
    };
  });
}

function hasCompleteCustomerInfo(session) {
  const info = session.customer_info || {};
  return Boolean(info.name && (info.phone || session.phone) && info.city && info.address);
}

module.exports = {
  processCustomerMessage,
  processBotResponse,
  getCartWithDetails,
  hasCompleteCustomerInfo
};


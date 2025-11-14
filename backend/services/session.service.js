const fs = require('fs').promises;
const path = require('path');

// Sessions en mémoire (temporaire)
const sessions = new Map();

/**
 * Récupère ou crée une session pour un numéro
 */
function getSession(clientId, phoneNumber) {
  const key = `${clientId}:${phoneNumber}`;
  
  if (!sessions.has(key)) {
    sessions.set(key, {
      phone: phoneNumber,
      client_id: clientId,
      cart: [],
      customer_info: {},
      bot_blocked: false,
      bot_blocked_until: null,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return sessions.get(key);
}

/**
 * Ajoute un produit au panier
 */
function addToCart(session, productId, quantity = 1) {
  const existing = session.cart.find(item => item.product_id === productId);
  
  if (existing) {
    existing.quantity += quantity;
  } else {
    session.cart.push({
      product_id: productId,
      quantity: quantity,
      added_at: new Date().toISOString()
    });
  }
  
  session.updated_at = new Date().toISOString();
  return session.cart;
}

/**
 * Met à jour les infos client
 */
function updateCustomerInfo(session, info) {
  session.customer_info = {
    ...session.customer_info,
    ...info,
    updated_at: new Date().toISOString()
  };
  
  return session.customer_info;
}

/**
 * Vérifie si le bot est bloqué (handover actif)
 */
function isBotBlocked(session) {
  if (!session.bot_blocked) return false;
  
  // Vérifier timeout
  if (session.bot_blocked_until) {
    const now = new Date();
    const until = new Date(session.bot_blocked_until);
    
    if (now > until) {
      // Timeout expiré, débloquer automatiquement
      session.bot_blocked = false;
      session.bot_blocked_until = null;
      return false;
    }
  }
  
  return true;
}

/**
 * Bloque le bot (humain prend la main)
 */
function blockBot(session, timeoutMinutes = 30) {
  session.bot_blocked = true;
  
  const until = new Date();
  until.setMinutes(until.getMinutes() + timeoutMinutes);
  session.bot_blocked_until = until.toISOString();
  
  console.log(`🚫 Bot bloqué pour ${session.phone} jusqu'à ${until.toLocaleTimeString()}`);
  
  return session;
}

/**
 * Débloque le bot manuellement
 */
function unblockBot(session) {
  session.bot_blocked = false;
  session.bot_blocked_until = null;
  
  console.log(`✅ Bot débloqué pour ${session.phone}`);
  
  return session;
}

/**
 * Sauvegarde une session dans le fichier conversations du client
 */
async function saveSession(session) {
  const conversationsPath = path.join(
    __dirname, 
    '../data/clients', 
    session.client_id, 
    'conversations.json'
  );
  
  try {
    const data = await fs.readFile(conversationsPath, 'utf8');
    const conversationsData = JSON.parse(data);
    
    // Trouver ou ajouter la conversation
    const index = conversationsData.conversations.findIndex(
      c => c.phone === session.phone
    );
    
    if (index >= 0) {
      conversationsData.conversations[index] = session;
    } else {
      conversationsData.conversations.push(session);
    }
    
    // Stats
    conversationsData.stats.total_conversations = conversationsData.conversations.length;
    conversationsData.stats.last_update = new Date().toISOString();
    
    await fs.writeFile(conversationsPath, JSON.stringify(conversationsData, null, 2));
    
  } catch (error) {
    console.error('Erreur sauvegarde session:', error);
  }
}

module.exports = {
  getSession,
  addToCart,
  updateCustomerInfo,
  isBotBlocked,
  blockBot,
  unblockBot,
  saveSession
};
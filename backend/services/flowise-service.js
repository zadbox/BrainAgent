require('dotenv').config();

/**
 * Génère une réponse via Flowise en injectant le context dans la question
 * Le system prompt reste dans Flowise (Amina prompt)
 */
async function generateResponse(flowiseConfig, catalog, session, userMessage) {
  try {
    const FLOWISE_ENDPOINT = `https://cloud.flowiseai.com/api/v1/prediction/${flowiseConfig.chatflow_id}`;
    
    console.log('📤 Envoi vers Flowise:', {
      client: catalog.client_id,
      chatflow: flowiseConfig.chatflow_id,
      messageLength: userMessage.length,
      cartItems: session.cart.length
    });

    // Calcul total panier
    const cartTotal = session.cart.reduce((sum, item) => {
      const product = catalog.products.find(p => p.id === item.product_id);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
    
    // Construire le message enrichi avec context
    let enrichedMessage = `[CONTEXT INTERNE - À utiliser pour ta réponse mais ne jamais mentionner au client]\n\n`;
    
    // CATALOGUE COMPLET
    enrichedMessage += `📦 CATALOGUE LATTAFA:\n`;
    catalog.products.forEach(p => {
      const stockEmoji = p.stock ? '✅' : '❌';
      enrichedMessage += `${stockEmoji} ${p.name} - ${p.price} MAD (${p.volume})\n`;
      enrichedMessage += `   Genre: ${p.gender} | Tags: ${p.tags.join(', ')}\n`;
      enrichedMessage += `   ${p.description}\n`;
      if (!p.stock && p.stock_alert) {
        enrichedMessage += `   ⚠️ ${p.stock_alert}\n`;
        if (p.similar && p.similar.length > 0) {
          const alternatives = p.similar.map(id => 
            catalog.products.find(pr => pr.id === id)?.name
          ).filter(Boolean);
          enrichedMessage += `   💡 Alternatives: ${alternatives.join(', ')}\n`;
        }
      }
      enrichedMessage += `\n`;
    });
    
    // PROMOTIONS
    enrichedMessage += `\n🎁 PROMOTIONS ACTIVES:\n`;
    catalog.promotions.forEach(p => {
      if (p.active) enrichedMessage += `- ${p.text}\n`;
    });
    enrichedMessage += `\n`;
    
    // PANIER ACTUEL
    if (session.cart.length > 0) {
      enrichedMessage += `🛒 PANIER ACTUEL DU CLIENT:\n`;
      session.cart.forEach(item => {
        const product = catalog.products.find(p => p.id === item.product_id);
        if (product) {
          enrichedMessage += `- ${product.name} x${item.quantity} = ${product.price * item.quantity} MAD\n`;
        }
      });
      enrichedMessage += `💰 Total panier: ${cartTotal} MAD\n`;
      
      // Livraison
      if (cartTotal >= catalog.shipping.free_from) {
        enrichedMessage += `✅ Livraison GRATUITE incluse!\n`;
      } else {
        const remaining = catalog.shipping.free_from - cartTotal;
        enrichedMessage += `📦 Encore ${remaining} MAD pour livraison gratuite (sinon +30 MAD)\n`;
      }
      
      // Promo 3+1
      const totalItems = session.cart.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems >= 3) {
        enrichedMessage += `🎁 Promo 3+1 applicable!\n`;
      }
      enrichedMessage += `\n`;
    }
    
    // INFOS CLIENT COLLECTÉES
    const customerInfo = session.customer_info || {};
    const hasName = customerInfo.name;
    const hasPhone = customerInfo.phone;
    const hasCity = customerInfo.city;
    const hasAddress = customerInfo.address;
    
    if (hasName || hasPhone || hasCity || hasAddress) {
      enrichedMessage += `👤 INFOS CLIENT DÉJÀ COLLECTÉES:\n`;
      if (hasName) enrichedMessage += `✅ Nom: ${customerInfo.name}\n`;
      else enrichedMessage += `❌ Nom: MANQUANT\n`;
      
      if (hasPhone) enrichedMessage += `✅ Téléphone: ${customerInfo.phone}\n`;
      else enrichedMessage += `❌ Téléphone: MANQUANT\n`;
      
      if (hasCity) enrichedMessage += `✅ Ville: ${customerInfo.city}\n`;
      else enrichedMessage += `❌ Ville: MANQUANT\n`;
      
      if (hasAddress) enrichedMessage += `✅ Adresse: ${customerInfo.address}\n`;
      else enrichedMessage += `❌ Adresse: MANQUANT\n`;
      
      enrichedMessage += `\n`;
      
      // Vérifier si tout est complet
      if (hasName && hasPhone && hasCity && hasAddress) {
        enrichedMessage += `✅ TOUTES LES INFOS SONT COMPLÈTES - TU PEUX VALIDER LA COMMANDE!\n\n`;
      } else {
        enrichedMessage += `⚠️ INFOS INCOMPLÈTES - NE PAS VALIDER, DEMANDER CE QUI MANQUE!\n\n`;
      }
    }
    
    // KEYWORDS DARIJA
    enrichedMessage += `💬 SI CLIENT PARLE DARIJA:\n`;
    Object.entries(catalog.darija_keywords).forEach(([darija, french]) => {
      enrichedMessage += `- "${darija}" = ${french}\n`;
    });
    enrichedMessage += `\n`;
    
    enrichedMessage += `[FIN CONTEXT - Réponds maintenant au message client]\n\n`;
    enrichedMessage += `MESSAGE CLIENT:\n${userMessage}`;

    // Appel API Flowise
    const response = await fetch(FLOWISE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: enrichedMessage
        // Pas d'overrideConfig ! Le system prompt Amina reste dans Flowise
      })      
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Flowise error response:', errorText);
      throw new Error(`Flowise API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('📥 Réponse Flowise type:', typeof data);
    
    // Extraction de la réponse
    let aiResponse;
    if (typeof data === 'string') {
      aiResponse = data;
    } else if (data.text) {
      aiResponse = data.text;
    } else if (data.output) {
      aiResponse = data.output;
    } else if (data.answer) {
      aiResponse = data.answer;
    } else {
      console.error('❌ Structure réponse inconnue:', data);
      aiResponse = JSON.stringify(data);
    }

    console.log('✅ Réponse extraite:', aiResponse.substring(0, 150) + '...');
    
    return aiResponse || 'Désolé, je n\'ai pas pu générer de réponse.';
    
  } catch (error) {
    console.error('❌ Erreur Flowise complète:', error);
    return `Désolé, une erreur s'est produite. Contactez-nous au ${catalog.whatsapp}.`;
  }
}

module.exports = {
  generateResponse
};
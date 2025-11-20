// Architecture SAAS Multi-Client - WhatsApp Automation avec Flowise
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Services
const clientService = require('./services/client.service');
const sessionService = require('./services/session.service');
const flowiseService = require('./services/flowise-service');
const whatsappService = require('./services/whatsapp.service');
const leadsService = require('./services/leads.service');
const orderParser = require('./services/order-parser');

// Express App
const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5174'
}));
app.use(express.json());

// Set pour tracker les messages envoyés par le bot (éviter boucle)
const sentMessageIds = new Set();

// Cache mémoire pour handover
const botBlockedCache = new Map();

// ============= CALLBACK GESTION MESSAGES =============

const handleIncomingMessage = async (msg, sessionId, clientId) => {
  // Vérifier que le message a la structure attendue
  if (!msg || !msg.key || !msg.message) return;
  
  const messageTimestamp = msg.messageTimestamp * 1000;
  if ((Date.now() - messageTimestamp) > 30000) return; // Ignorer vieux messages

  const isFromMe = msg.key.fromMe;
  const remoteJid = msg.key.remoteJid;
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

  if (!text) return;

  // Ignorer messages bot
  if (isFromMe && sentMessageIds.has(msg.key.id)) return;

  console.log(`\n📩 [${sessionId}] Message reçu de ${remoteJid}`);

  try {
    // Charger catalog & session
    const catalog = await clientService.getClientData(clientId);
    const userSession = sessionService.getSession(clientId, remoteJid);

    if (!isFromMe) {
        const parsingResult = orderParser.processCustomerMessage(userSession, catalog, text);
        if (parsingResult.infoCaptured) {
            console.log(`   📝 Infos client mises à jour:`, userSession.customer_info);
        }
        if (parsingResult.cartUpdated) {
            console.log(`   🛒 Panier mis à jour:`, userSession.cart);
        }
    }

    // --- HANDOVER LOGIC ---
    if (isFromMe) {
        console.log(`   👤 Admin (${sessionId}) a répondu`);
        sessionService.blockBot(userSession, 30);
        userSession.messages.push({ from: 'admin', text, timestamp: new Date().toISOString() });
        await sessionService.saveSession(userSession);
        return;
    }

    // User message
    userSession.messages.push({ from: 'customer', text, timestamp: new Date().toISOString() });

    // Vérifier blocage
    if (sessionService.isBotBlocked(userSession)) {
        await sessionService.saveSession(userSession);
        return;
    }

    // --- FLOWISE GENERATION ---
    console.log(`   🤖 Bot (${sessionId}) génère réponse...`);
    let response;
    try {
        response = await flowiseService.generateResponse(catalog.flowise, catalog, userSession, text);
        console.log(`   ✅ Réponse générée: ${response.substring(0, 100)}...`);
    } catch (e) {
        console.error('❌ Flowise Error:', e.message);
        console.error('Stack:', e.stack);
        response = "Désolé, une erreur technique est survenue.";
    }

    // Envoyer réponse
    const sock = whatsappService.getSession(sessionId);
    console.log(`   📤 Socket trouvé: ${!!sock}`);
    if (sock) {
        console.log(`   📤 Envoi message à ${remoteJid}...`);
        try {
            const sent = await sock.sendMessage(remoteJid, { text: response });
            console.log(`   ✅ Message envoyé!`);
            if (sent?.key?.id) {
                sentMessageIds.add(sent.key.id);
                setTimeout(() => sentMessageIds.delete(sent.key.id), 5000);
            }
        } catch (sendError) {
            console.error(`   ❌ Erreur envoi message:`, sendError.message);
        }
    } else {
        console.error(`   ❌ Pas de socket trouvé pour session ${sessionId}`);
    }

    orderParser.processBotResponse(userSession, response, catalog);

    userSession.messages.push({ from: 'bot', text: response, timestamp: new Date().toISOString() });
    await sessionService.saveSession(userSession);

    const cartDetails = orderParser.getCartWithDetails(userSession, catalog);
    const customerInfo = userSession.customer_info || {};
    const phoneFromJid = remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid;
    const hasAllInfo = cartDetails.length > 0 &&
      customerInfo.name &&
      (customerInfo.phone || phoneFromJid) &&
      customerInfo.address &&
      customerInfo.city &&
      !userSession.orderConverted;

    if (hasAllInfo) {
      console.log(`   📦 Commande complète détectée, création du lead...`);
      try {
        const totalAmount = cartDetails.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const leadData = {
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone || phoneFromJid,
          customerAddress: `${customerInfo.address}${customerInfo.city ? `, ${customerInfo.city}` : ''}`,
          products: cartDetails,
          totalAmount,
          status: 'new',
          sessionId: remoteJid,
          conversationHistory: userSession.messages.slice(-20)
        };

        const lead = await leadsService.createLead(clientId, leadData);
        userSession.orderConverted = true;
        userSession.orderLeadId = lead.id;
        await sessionService.saveSession(userSession);

        console.log(`   ✅ Lead créé avec succès (${lead.id})`);
      } catch (leadError) {
        console.error(`   ❌ Erreur création lead:`, leadError.message);
      }
    }

  } catch (error) {
    console.error('❌ Erreur handler:', error);
  }
};

// ============= API ROUTES =============

// 1. Status global
app.get('/api/status', (req, res) => {
  res.json({
    server: 'running',
    sessions: whatsappService.getAllSessions()
  });
});

// 2. Démarrer une session (connexion nouveau numéro)
app.post('/api/sessions/start', async (req, res) => {
  const { sessionId, clientId } = req.body; // sessionId peut être "phone-1", "commercial-2", etc.
  
  if (!sessionId || !clientId) return res.status(400).json({ error: 'Missing sessionId or clientId' });

  try {
    await whatsappService.startSession(sessionId, clientId, {
      onQR: (qr) => console.log(`QR update for ${sessionId}`),
      onReady: () => console.log(`Session ${sessionId} ready`),
      onMessage: handleIncomingMessage
    });
    res.json({ success: true, message: 'Session initialization started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Obtenir QR / Status d'une session spécifique
app.get('/api/sessions/:sessionId/status', (req, res) => {
  const status = whatsappService.getSessionStatus(req.params.sessionId);
  res.json(status);
});

// 4. Déconnecter une session
app.post('/api/sessions/:sessionId/logout', async (req, res) => {
  try {
    await whatsappService.logoutSession(req.params.sessionId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Routes existantes Clients (Proxied)
app.get('/api/clients', async (req, res) => {
  const clients = await clientService.listClients();
  res.json({ success: true, clients });
});

// Créer un client
app.post('/api/clients', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nom requis' });
    
    const newClient = await clientService.createClient(name);
    res.json({ success: true, client: newClient });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Supprimer un client
app.delete('/api/clients/:clientId', async (req, res) => {
  try {
    await clientService.deleteClient(req.params.clientId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/clients/:clientId/catalog', async (req, res) => {
  try {
    const catalog = await clientService.getClientData(req.params.clientId);
    res.json({ success: true, catalog });
    } catch (e) { res.status(404).json({ error: 'Not found' }); }
});

app.put('/api/clients/:clientId/catalog', async (req, res) => {
    await clientService.updateClientCatalog(req.params.clientId, req.body);
    res.json({ success: true });
});

// Conversations d'un client
app.get('/api/clients/:clientId/conversations', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const conversationsPath = path.join(__dirname, 'data/clients', req.params.clientId, 'conversations.json');
    const data = await fs.readFile(conversationsPath, 'utf8');
    res.json({ success: true, data: JSON.parse(data) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test Agent Flowise
app.post('/api/test-flowise', async (req, res) => {
  try {
    const { clientId, question } = req.body;
    if (!clientId || !question) return res.status(400).json({ error: 'Missing params' });

    const catalog = await clientService.getClientData(clientId);
    const mockSession = { phone: 'test', cart: [], customer_info: {}, messages: [] };
    
    const response = await flowiseService.generateResponse(
      catalog.flowise,
      catalog,
      mockSession,
      question
    );

    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= LEADS / COMMANDES API =============

// Récupérer tous les leads d'un client
app.get('/api/clients/:clientId/leads', async (req, res) => {
  const { clientId } = req.params;
  const { status } = req.query;

  try {
    const filters = status ? { status } : {};
    const leads = await leadsService.getLeads(clientId, filters);
    res.json({ success: true, leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer les statistiques des leads
app.get('/api/clients/:clientId/leads/stats', async (req, res) => {
  const { clientId } = req.params;

  try {
    const stats = await leadsService.getLeadsStats(clientId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer un lead spécifique
app.get('/api/clients/:clientId/leads/:leadId', async (req, res) => {
  const { clientId, leadId } = req.params;

  try {
    const lead = await leadsService.getLead(clientId, leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un nouveau lead
app.post('/api/clients/:clientId/leads', async (req, res) => {
  const { clientId } = req.params;
  const leadData = req.body;

  try {
    const lead = await leadsService.createLead(clientId, leadData);
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mettre à jour un lead
app.put('/api/clients/:clientId/leads/:leadId', async (req, res) => {
  const { clientId, leadId } = req.params;
  const updates = req.body;

  try {
    const lead = await leadsService.updateLead(clientId, leadId, updates);
    res.json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer un lead
app.delete('/api/clients/:clientId/leads/:leadId', async (req, res) => {
  const { clientId, leadId } = req.params;

  try {
    await leadsService.deleteLead(clientId, leadId);
    res.json({ success: true, message: 'Lead deleted' });
    } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3005;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔═══════════════════════════════════════╗
║   BRAIN WHATSAPP - MULTI-SESSION      ║
╚═══════════════════════════════════════╝
🌐 Server: http://localhost:${PORT}
  `);
});

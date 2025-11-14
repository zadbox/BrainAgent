// bot-whatsapp/backend/server.js
// Architecture SAAS Multi-Client - WhatsApp Automation avec Flowise

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Services
const clientService = require('./services/client.service');
const sessionService = require('./services/session.service');
const flowiseService = require('./services/flowise-service');

// Express App
const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json());

// Variables globales WhatsApp
let whatsappReady = false;
let qrCode = null;
let whatsappClient = null;

// ============= API ROUTES =============

// Status serveur + WhatsApp
app.get('/api/status', (req, res) => {
  res.json({
    whatsapp: whatsappReady ? 'connected' : 'disconnected',
    qrAvailable: !!qrCode,
    server: 'running',
    timestamp: new Date().toISOString()
  });
});

// QR Code pour connection WhatsApp
app.get('/api/qr', (req, res) => {
  res.json({
    qr: qrCode || null,
    ready: whatsappReady
  });
});

// Liste des clients actifs
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await clientService.listClients();
    res.json({ success: true, clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catalog d'un client spécifique
app.get('/api/clients/:clientId/catalog', async (req, res) => {
  try {
    const catalog = await clientService.getClientData(req.params.clientId);
    res.json({ success: true, catalog });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Client non trouvé' });
  }
});

// Mise à jour catalog client
app.put('/api/clients/:clientId/catalog', async (req, res) => {
  try {
    await clientService.updateClientCatalog(req.params.clientId, req.body);
    res.json({ success: true, message: 'Catalog mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

// Handover : Admin prend la main sur une conversation
app.post('/api/clients/:clientId/conversations/:phone/takeover', async (req, res) => {
  try {
    const { clientId, phone } = req.params;
    const session = sessionService.getSession(clientId, phone);
    
    const timeoutMinutes = req.body.timeout || 30;
    sessionService.blockBot(session, timeoutMinutes);
    await sessionService.saveSession(session);
    
    res.json({ 
      success: true, 
      message: `Bot bloqué pour ${timeoutMinutes} minutes`,
      blocked_until: session.bot_blocked_until
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handover : Admin libère le bot
app.post('/api/clients/:clientId/conversations/:phone/release', async (req, res) => {
  try {
    const { clientId, phone } = req.params;
    const session = sessionService.getSession(clientId, phone);
    
    sessionService.unblockBot(session);
    await sessionService.saveSession(session);
    
    res.json({ 
      success: true, 
      message: 'Bot débloqué'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Envoi manuel de message par l'admin
app.post('/api/clients/:clientId/send', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { phone, message } = req.body;
    
    if (!whatsappClient || !whatsappReady) {
      return res.status(503).json({ success: false, error: 'WhatsApp non connecté' });
    }
    
    // Envoyer le message
    await whatsappClient.sendMessage(phone, { text: message });
    
    // Bloquer le bot automatiquement (l'admin a pris la main)
    const session = sessionService.getSession(clientId, phone);
    sessionService.blockBot(session, 30);
    
    // Sauvegarder le message dans l'historique
    session.messages.push({
      from: 'admin',
      text: message,
      timestamp: new Date().toISOString()
    });
    
    await sessionService.saveSession(session);
    
    res.json({ 
      success: true, 
      message: 'Message envoyé et bot bloqué pour 30min'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============= WHATSAPP INIT =============

async function initWhatsApp() {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@itsukichan/baileys');
  const { Boom } = require('@hapi/boom');
  const pino = require('pino');
  
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  });

  whatsappClient = sock;

  // Connection update
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrCode = qr;
      console.log('📱 QR Code généré - Disponible sur /api/qr');
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️  Connection fermée, reconnexion:', shouldReconnect);
      
      if (shouldReconnect) {
        whatsappReady = false;
        setTimeout(() => initWhatsApp(), 5000);
      }
    } else if (connection === 'open') {
      whatsappReady = true;
      qrCode = null;
      console.log('✅ WhatsApp connecté!');
    }
  });
  
  // Save credentials
  sock.ev.on('creds.update', saveCreds);
  
  // ============= HANDLE MESSAGES =============
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    
    // ✅ FIX 1: Ignorer messages de plus de 30 secondes (historique au redémarrage)
    const messageTimestamp = msg.messageTimestamp * 1000;
    const now = Date.now();
    const ageInSeconds = (now - messageTimestamp) / 1000;
    
    if (ageInSeconds > 30) {
      console.log(`   ⏭️  Message ancien ignoré (${Math.floor(ageInSeconds)}s)`);
      return;
    }
    
    const from = msg.key.remoteJid;
    const isFromMe = msg.key.fromMe;
    
    // ✅ FIX 2: Ignorer TOUS les messages du bot (éviter boucle infinie)
    if (isFromMe) {
      console.log(`   ⏭️  Message du bot ignoré`);
      return;
    }
    
    // Extraire le texte du message
    const text = msg.message?.conversation || 
                msg.message?.extendedTextMessage?.text || '';
    
    if (!text) return;
    
    console.log(`\n📩 Message reçu de ${from}`);
    console.log(`   "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   De moi (admin): ${isFromMe}`);
    
    try {
      // 1. Identifier le client
      const clientId = await clientService.identifyClient(from);
      console.log(`   🏢 Client: ${clientId}`);
      
      // 2. Charger le catalog du client
      const catalog = await clientService.getClientData(clientId);
      
      // 3. Récupérer/créer la session
      const session = sessionService.getSession(clientId, from);
      
      // 4. Sauvegarder le message client
      session.messages.push({
        from: 'customer',
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // 5. Vérifier si le bot est bloqué (handover actif)
      if (sessionService.isBotBlocked(session)) {
        console.log(`   🚫 Bot bloqué - Message pour l'admin uniquement`);
        
        // Sauvegarder et ne rien faire (l'admin verra le message dans WhatsApp)
        await sessionService.saveSession(session);
        return;
      }
      
      // 6. Le bot peut répondre
      console.log(`   🤖 Bot actif - Génération réponse...`);
      
      // 7. Appeler Flowise pour générer la réponse
      const response = await flowiseService.generateResponse(
        catalog.flowise,
        catalog,
        session,
        text
      );
      
      // 8. Envoyer la réponse
      try {
        await whatsappClient.sendMessage(from, { text: response });
        console.log(`   ✅ Réponse bot envoyée`);
      } catch (sendError) {
        console.error(`   ❌ Erreur envoi:`, sendError.message);
        // Ne pas bloquer - on continue pour sauvegarder quand même
      }
      
      // 9. Sauvegarder la réponse bot
      session.messages.push({
        from: 'bot',
        text: response,
        timestamp: new Date().toISOString()
      });
      
      await sessionService.saveSession(session);
      
    } catch (error) {
      console.error('❌ Erreur traitement message:', error.message);
      // Ne pas envoyer de message d'erreur automatique au client
    }
  });
}

// ============= START SERVER =============

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════╗
║   BRAIN WHATSAPP - MULTI-CLIENT SAAS  ║
║        Powered by Flowise AI          ║
╚═══════════════════════════════════════╝

🌐 API Server: http://localhost:${PORT}
📱 En attente connexion WhatsApp...
🔧 Architecture: Multi-tenant
  `);
  
  // Lister les clients actifs au démarrage
  try {
    const clients = await clientService.listClients();
    console.log(`\n👥 Clients actifs: ${clients.length}`);
    clients.forEach(c => {
      console.log(`   • ${c.name} (${c.id})`);
    });
  } catch (error) {
    console.error('⚠️  Erreur chargement clients:', error.message);
  }
  
  console.log('\n🚀 Initialisation WhatsApp...\n');
  await initWhatsApp();
});

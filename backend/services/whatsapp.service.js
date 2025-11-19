const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@itsukichan/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppService {
  constructor() {
    this.sessions = new Map(); // Map<sessionId, socket>
    this.qrCodes = new Map();  // Map<sessionId, qrCode>
    this.sessionStatus = new Map(); // Map<sessionId, status>
  }

  async startSession(sessionId, clientId, eventCallbacks = {}) {
    const authPath = path.join(__dirname, '../sessions', `auth_info_${sessionId}`);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Brain WhatsApp', 'Chrome', '1.0.0']
    });

    // Stocker la session
    this.sessions.set(sessionId, sock);
    this.sessionStatus.set(sessionId, 'connecting');

    // Gérer les événements
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCodes.set(sessionId, qr);
        this.sessionStatus.set(sessionId, 'qr_ready');
        console.log(`[${sessionId}] 📱 QR Code généré`);
        if (eventCallbacks.onQR) eventCallbacks.onQR(qr);
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[${sessionId}] ⚠️ Connection fermée, reconnexion: ${shouldReconnect}`);
        
        if (shouldReconnect) {
            this.sessionStatus.set(sessionId, 'reconnecting');
            // Reconnexion automatique avec délai
            setTimeout(() => this.startSession(sessionId, clientId, eventCallbacks), 5000);
        } else {
            this.sessionStatus.set(sessionId, 'disconnected');
            this.sessions.delete(sessionId);
            this.qrCodes.delete(sessionId);
            // Nettoyer dossier auth si déconnecté explicitement
            // await fs.rm(authPath, { recursive: true, force: true });
        }
      } else if (connection === 'open') {
        this.sessionStatus.set(sessionId, 'connected');
        this.qrCodes.delete(sessionId);
        console.log(`[${sessionId}] ✅ WhatsApp connecté!`);
        if (eventCallbacks.onReady) eventCallbacks.onReady();
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Proxy les messages vers le callback
    sock.ev.on('messages.upsert', async ({ messages }) => {
      if (eventCallbacks.onMessage && messages && messages.length > 0) {
        for (const msg of messages) {
          try {
            await eventCallbacks.onMessage(msg, sessionId, clientId);
          } catch (error) {
            console.error(`Erreur traitement message:`, error);
          }
        }
      }
    });

    return sock;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getSessionStatus(sessionId) {
    return {
      status: this.sessionStatus.get(sessionId) || 'disconnected',
      qr: this.qrCodes.get(sessionId) || null
    };
  }

  async logoutSession(sessionId) {
    const sock = this.sessions.get(sessionId);
    if (sock) {
      await sock.logout();
      this.sessions.delete(sessionId);
      this.qrCodes.delete(sessionId);
      this.sessionStatus.set(sessionId, 'disconnected');
      
      // Nettoyer le dossier session
      const authPath = path.join(__dirname, '../sessions', `auth_info_${sessionId}`);
      try {
        await fs.rm(authPath, { recursive: true, force: true });
      } catch (e) {
        console.error(`Erreur suppression session ${sessionId}:`, e);
      }
    }
  }

  getAllSessions() {
    return Array.from(this.sessionStatus.keys()).map(id => ({
      id,
      ...this.getSessionStatus(id)
    }));
  }
}

module.exports = new WhatsAppService();


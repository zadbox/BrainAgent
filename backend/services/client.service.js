const fs = require('fs').promises;
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '../data/clients');

// S'assurer que le dossier clients existe
(async () => {
  try {
    await fs.mkdir(CLIENTS_DIR, { recursive: true });
  } catch (e) {
    console.error("Erreur création dossier clients:", e);
  }
})();

/**
 * Charge le catalog complet d'un client (qui contient tout)
 */
async function getClientData(clientId) {
  const catalogPath = path.join(CLIENTS_DIR, clientId, 'catalog.json');
  const data = await fs.readFile(catalogPath, 'utf8');
  return JSON.parse(data);
}

/**
 * Identifie quel client possède un numéro WhatsApp
 * (Méthode Legacy - à revoir avec le multi-session sessionId)
 */
async function identifyClient(whatsappNumber) {
  try {
    const clients = await fs.readdir(CLIENTS_DIR);
    
    for (const clientId of clients) {
      // Skip .DS_Store etc
      if (clientId.startsWith('.')) continue;

      try {
        const catalog = await getClientData(clientId);
        if (catalog.whatsapp === whatsappNumber || catalog.status === 'active') {
          return clientId;
        }
      } catch (err) {
        continue;
      }
    }
    return clients[0]; // Fallback
  } catch (error) {
    console.error('❌ Erreur identification client:', error);
    return null;
  }
}

/**
 * Liste tous les clients
 */
async function listClients() {
  try {
    const clients = await fs.readdir(CLIENTS_DIR);
    const catalogs = [];
    
    for (const clientId of clients) {
      if (clientId.startsWith('.')) continue;
      
      try {
        const catalog = await getClientData(clientId);
        catalogs.push({
          id: clientId,
          name: catalog.client_name || clientId,
          whatsapp: catalog.whatsapp,
          status: catalog.status || 'active'
        });
      } catch (err) {
        // Ignore dossiers vides ou corrompus
        continue;
      }
    }
    return catalogs;
  } catch (e) {
    return [];
  }
}

/**
 * Met à jour le catalog d'un client
 */
async function updateClientCatalog(clientId, updatedCatalog) {
  const catalogPath = path.join(CLIENTS_DIR, clientId, 'catalog.json');
  
  // Assurer que le champ id ne change pas
  const current = await getClientData(clientId);
  const toSave = { ...current, ...updatedCatalog, id: clientId };
  
  await fs.writeFile(catalogPath, JSON.stringify(toSave, null, 2));
  console.log(`✅ Catalog ${clientId} mis à jour`);
}

/**
 * Crée un nouveau client
 */
async function createClient(clientName) {
  // ID simple : minuscules, sans espaces
  const id = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const clientPath = path.join(CLIENTS_DIR, id);
  
  // Vérifier existence
  try {
    await fs.access(clientPath);
    throw new Error('Client existe déjà');
  } catch (e) {
    if (e.message === 'Client existe déjà') throw e;
  }

  await fs.mkdir(clientPath, { recursive: true });

  // Données par défaut
  const defaultCatalog = {
    id: id,
    client_name: clientName,
    status: 'active',
    whatsapp: '',
    flowise: {
      apiUrl: ''
    },
    products: []
  };

  const defaultConversations = {
    conversations: [],
    stats: {
      total_conversations: 0,
      last_update: new Date().toISOString()
    }
  };

  await fs.writeFile(path.join(clientPath, 'catalog.json'), JSON.stringify(defaultCatalog, null, 2));
  await fs.writeFile(path.join(clientPath, 'conversations.json'), JSON.stringify(defaultConversations, null, 2));

  return { id, ...defaultCatalog };
}

/**
 * Supprime un client
 */
async function deleteClient(clientId) {
  const clientPath = path.join(CLIENTS_DIR, clientId);
  await fs.rm(clientPath, { recursive: true, force: true });
}

module.exports = {
  getClientData,
  identifyClient,
  listClients,
  updateClientCatalog,
  createClient,
  deleteClient
};

const fs = require('fs').promises;
const path = require('path');

const CLIENTS_DIR = path.join(__dirname, '../data/clients');

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
 */
async function identifyClient(whatsappNumber) {
  try {
    const clients = await fs.readdir(CLIENTS_DIR);
    
    for (const clientId of clients) {
      try {
        const catalog = await getClientData(clientId);
        
        // Match par numéro WhatsApp OU statut actif
        if (catalog.whatsapp === whatsappNumber || 
            catalog.status === 'active') {
          return clientId;
        }
      } catch (err) {
        continue;
      }
    }
    
    // Fallback : premier client actif
    return clients[0];
    
  } catch (error) {
    console.error('❌ Erreur identification client:', error);
    return 'lattafa'; // Fallback
  }
}

/**
 * Liste tous les clients actifs
 */
async function listClients() {
  const clients = await fs.readdir(CLIENTS_DIR);
  const catalogs = [];
  
  for (const clientId of clients) {
    try {
      const catalog = await getClientData(clientId);
      if (catalog.status === 'active') {
        catalogs.push({
          id: clientId,
          name: catalog.client_name,
          whatsapp: catalog.whatsapp
        });
      }
    } catch (err) {
      continue;
    }
  }
  
  return catalogs;
}

/**
 * Met à jour le catalog d'un client
 */
async function updateClientCatalog(clientId, updatedCatalog) {
  const catalogPath = path.join(CLIENTS_DIR, clientId, 'catalog.json');
  await fs.writeFile(catalogPath, JSON.stringify(updatedCatalog, null, 2));
  console.log(`✅ Catalog ${clientId} mis à jour`);
}

module.exports = {
  getClientData,
  identifyClient,
  listClients,
  updateClientCatalog
};
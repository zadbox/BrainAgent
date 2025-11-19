// Service de gestion des leads/commandes
const fs = require('fs').promises;
const path = require('path');

class LeadsService {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/clients');
  }

  /**
   * Créer un nouveau lead/commande
   */
  async createLead(clientId, leadData) {
    const leadsFile = path.join(this.dataDir, clientId, 'leads.json');
    
    // Créer l'objet lead
    const lead = {
      id: `lead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clientId,
      customerName: leadData.customerName || '',
      customerPhone: leadData.customerPhone || '',
      customerAddress: leadData.customerAddress || '',
      products: leadData.products || [], // [{name, quantity, price}]
      totalAmount: leadData.totalAmount || 0,
      status: leadData.status || 'new', // new, confirmed, shipped, delivered, cancelled
      sessionId: leadData.sessionId || '',
      conversationHistory: leadData.conversationHistory || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Charger les leads existants
    let leads = [];
    try {
      const data = await fs.readFile(leadsFile, 'utf-8');
      leads = JSON.parse(data);
    } catch (error) {
      // Le fichier n'existe pas encore
      leads = [];
    }

    // Ajouter le nouveau lead
    leads.push(lead);

    // Sauvegarder
    await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2));

    console.log(`✅ Lead créé: ${lead.id} pour client ${clientId}`);
    return lead;
  }

  /**
   * Récupérer tous les leads d'un client
   */
  async getLeads(clientId, filters = {}) {
    const leadsFile = path.join(this.dataDir, clientId, 'leads.json');
    
    try {
      const data = await fs.readFile(leadsFile, 'utf-8');
      let leads = JSON.parse(data);

      // Filtrer par statut si demandé
      if (filters.status) {
        leads = leads.filter(lead => lead.status === filters.status);
      }

      // Trier par date (plus récent en premier)
      leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return leads;
    } catch (error) {
      return [];
    }
  }

  /**
   * Récupérer un lead spécifique
   */
  async getLead(clientId, leadId) {
    const leads = await this.getLeads(clientId);
    return leads.find(lead => lead.id === leadId);
  }

  /**
   * Mettre à jour un lead
   */
  async updateLead(clientId, leadId, updates) {
    const leadsFile = path.join(this.dataDir, clientId, 'leads.json');
    
    try {
      const data = await fs.readFile(leadsFile, 'utf-8');
      let leads = JSON.parse(data);

      const leadIndex = leads.findIndex(lead => lead.id === leadId);
      if (leadIndex === -1) {
        throw new Error('Lead not found');
      }

      // Mettre à jour
      leads[leadIndex] = {
        ...leads[leadIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Sauvegarder
      await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2));

      return leads[leadIndex];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un lead
   */
  async deleteLead(clientId, leadId) {
    const leadsFile = path.join(this.dataDir, clientId, 'leads.json');
    
    try {
      const data = await fs.readFile(leadsFile, 'utf-8');
      let leads = JSON.parse(data);

      leads = leads.filter(lead => lead.id !== leadId);

      await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2));

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir les statistiques des leads
   */
  async getLeadsStats(clientId) {
    const leads = await this.getLeads(clientId);

    const stats = {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      confirmed: leads.filter(l => l.status === 'confirmed').length,
      shipped: leads.filter(l => l.status === 'shipped').length,
      delivered: leads.filter(l => l.status === 'delivered').length,
      cancelled: leads.filter(l => l.status === 'cancelled').length,
      totalRevenue: leads
        .filter(l => l.status !== 'cancelled')
        .reduce((sum, lead) => sum + (lead.totalAmount || 0), 0)
    };

    return stats;
  }
}

module.exports = new LeadsService();


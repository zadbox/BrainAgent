import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import SessionManager from './components/SessionManager';
import ProductCatalog from './components/ProductCatalog';
import Conversations from './components/Conversations';
import Leads from './components/Leads';
import { Settings, UserCheck, X, MessageSquare, ShoppingBag, Package } from 'lucide-react';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClient, setSelectedClient] = useState(null); // Objet complet du client sélectionné
  const [clients, setClients] = useState([]);

  // Charger les clients au démarrage pour avoir les noms
  useEffect(() => {
    axios.get('/api/clients')
      .then(res => setClients(res.data.clients || []))
      .catch(err => console.error(err));
  }, []);

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    // Optionnel : Changer d'onglet automatiquement ? 
    // Pour l'instant on reste sur le dashboard car il contient les sessions
  };

  return (
    <>
      <Toaster position="top-right" />
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        
        {/* Barre d'info Client Actif */}
        {selectedClient && (
          <div className="mb-6 bg-gray-50 border-l-4 border-black p-4 rounded-r-md flex justify-between items-center animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="bg-black text-white p-2 rounded-full">
                <UserCheck size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Client Actif</p>
                <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2>
              </div>
            </div>
            <button 
              onClick={() => setSelectedClient(null)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Désélectionner"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <SessionManager 
            globalSelectedClient={selectedClient}
            onClientSelect={handleClientSelect}
          />
        )}

        {activeTab === 'chat' && (
          selectedClient ? (
            // TODO: Mettre à jour Conversations pour accepter un object client ou id
            <div className="h-full flex flex-col">
               <Conversations clientId={selectedClient.id} />
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 border-2 border-dashed border-gray-200 rounded-lg">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-600">Aucun client sélectionné</p>
                <p className="text-sm mt-2">Veuillez sélectionner un client dans le Tableau de Bord pour voir ses conversations.</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 bg-black text-white px-4 py-2 rounded-md text-sm"
                >
                  Aller au Tableau de Bord
                </button>
             </div>
          )
        )}

        {activeTab === 'leads' && (
          selectedClient ? (
            <div className="h-full flex flex-col">
              <Leads clientId={selectedClient.id} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 border-2 border-dashed border-gray-200 rounded-lg">
                <Package size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-600">Aucun client sélectionné</p>
                <p className="text-sm mt-2">Veuillez sélectionner un client dans le Tableau de Bord pour voir ses commandes.</p>
                 <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 bg-black text-white px-4 py-2 rounded-md text-sm"
                >
                  Aller au Tableau de Bord
                </button>
             </div>
          )
        )}

        {activeTab === 'catalog' && (
          selectedClient ? (
            <ProductCatalog preSelectedClientId={selectedClient.id} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10 border-2 border-dashed border-gray-200 rounded-lg">
                <ShoppingBag size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-600">Aucun client sélectionné</p>
                <p className="text-sm mt-2">Veuillez sélectionner un client dans le Tableau de Bord pour gérer son catalogue.</p>
                 <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 bg-black text-white px-4 py-2 rounded-md text-sm"
                >
                  Aller au Tableau de Bord
                </button>
             </div>
          )
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto mt-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Settings size={32} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Paramètres</h2>
            <p className="text-gray-500 mt-2">
              Configuration du compte et préférences système.
            </p>
          </div>
        )}

      </Layout>
    </>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Plus, Smartphone, Trash2, Users, X, QrCode, ChevronLeft, ShoppingBag, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

const SessionManager = ({ globalSelectedClient, onClientSelect }) => {
  // State Clients
  const [clients, setClients] = useState([]);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');

  // State Sessions
  const [sessions, setSessions] = useState([]);
  const [newSessionId, setNewSessionId] = useState('');
  const [loadingSession, setLoadingSession] = useState(false);

  // State Client Details (si un client est sélectionné)
  const [clientCatalog, setClientCatalog] = useState(null);
  const [clientConversations, setClientConversations] = useState([]);

  // --- Init & Polling ---
  useEffect(() => {
    fetchClients();
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Charger détails client quand sélectionné
  useEffect(() => {
    if (globalSelectedClient) {
      loadClientDetails(globalSelectedClient.id);
    } else {
      setClientCatalog(null);
      setClientConversations([]);
    }
  }, [globalSelectedClient]);

  // --- API Calls ---
  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data.clients || []);
    } catch (err) {
      console.error("Erreur chargement clients", err);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/status');
      setSessions(res.data.sessions || []);
      
      if (newSessionId) {
        const session = res.data.sessions.find(s => s.id === newSessionId);
        if (session?.status === 'connected') {
          setNewSessionId('');
          toast.success('WhatsApp connecté !');
          if (globalSelectedClient) {
            loadClientDetails(globalSelectedClient.id); // Refresh
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadClientDetails = async (clientId) => {
    try {
      // Charger catalogue
      const catalogRes = await axios.get(`/api/clients/${clientId}/catalog`);
      setClientCatalog(catalogRes.data.catalog);

      // Charger conversations
      const convRes = await axios.get(`/api/clients/${clientId}/conversations`);
      const convData = convRes.data.data;
      let convArray = [];
      if (Array.isArray(convData.conversations)) {
        convArray = convData.conversations;
      } else if (typeof convData.conversations === 'object') {
        convArray = Object.values(convData.conversations);
      }
      setClientConversations(convArray.slice(-5).reverse()); // 5 dernières conversations
    } catch (err) {
      console.error("Erreur chargement détails client", err);
    }
  };

  // --- Client Handlers ---
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      await axios.post('/api/clients', { name: newClientName });
      toast.success('Client créé');
      setNewClientName('');
      setShowClientForm(false);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    }
  };

  const handleDeleteClient = async (e, clientId) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce client et toutes ses données ?')) return;
    
    try {
      await axios.delete(`/api/clients/${clientId}`);
      toast.success('Client supprimé');
      fetchClients();
      if (globalSelectedClient?.id === clientId) {
        onClientSelect(null);
      }
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  // --- Session Handlers ---
  const handleStartSession = async () => {
    if (!globalSelectedClient) return toast.error('Sélectionnez un client');
    
    const sessionId = `${globalSelectedClient.id}-${Date.now().toString().slice(-5)}`;
    setNewSessionId(sessionId);
    setLoadingSession(true);

    try {
      await axios.post('/api/sessions/start', {
        clientId: globalSelectedClient.id,
        sessionId: sessionId
      });
      toast.loading('Génération QR...', { duration: 2000 });
    } catch (err) {
      toast.error("Erreur démarrage");
      setNewSessionId('');
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLogoutSession = async (sessionId) => {
    if (!confirm('Déconnecter ?')) return;
    try {
      await axios.post(`/api/sessions/${sessionId}/logout`);
      toast.success('Déconnecté');
    } catch (err) {
      console.error(err);
    }
  };

  const qrSessions = sessions.filter(s => s.status === 'qr_ready');

  // ==========================================
  // VUE DÉTAILS CLIENT (Quand un client est sélectionné)
  // ==========================================
  if (globalSelectedClient) {
    const clientSessions = sessions.filter(s => s.id.startsWith(globalSelectedClient.id));
    const clientQRs = qrSessions.filter(s => s.id.startsWith(globalSelectedClient.id));

    return (
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4">
        {/* Header avec retour */}
        <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
          <button 
            onClick={() => onClientSelect(null)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{globalSelectedClient.name}</h1>
            <p className="text-sm text-gray-500">ID: {globalSelectedClient.id}</p>
          </div>
          <button 
            onClick={handleStartSession}
            className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={16} />
            Connecter WhatsApp
          </button>
        </div>

        {/* QR Codes actifs pour ce client */}
        {clientQRs.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <QrCode size={20} /> Scannez pour connecter
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientQRs.map(session => (
                <div key={session.id} className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col items-center">
                  <p className="text-xs text-gray-500 mb-3">Session: {session.id}</p>
                  <QRCodeCanvas value={session.qr} size={180} />
                  <p className="text-xs text-blue-600 mt-3 animate-pulse">En attente du scan...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="text-emerald-600" size={20} />
              <span className="text-sm font-medium text-gray-500">Sessions WhatsApp</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {clientSessions.filter(s => s.status === 'connected').length}
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBag className="text-blue-600" size={20} />
              <span className="text-sm font-medium text-gray-500">Produits</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {clientCatalog?.products?.length || 0}
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-purple-600" size={20} />
              <span className="text-sm font-medium text-gray-500">Conversations</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {clientConversations.length}
            </div>
          </div>
        </div>

        {/* Sessions actives */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Sessions WhatsApp de ce client</h3>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
              {clientSessions.length} session(s)
            </span>
          </div>
          {clientSessions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Smartphone size={40} className="mx-auto mb-3 opacity-20" />
              <p>Aucune session WhatsApp connectée pour ce client.</p>
              <button 
                onClick={handleStartSession}
                className="mt-4 bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800"
              >
                Connecter maintenant
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientSessions.map(session => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{session.id}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleLogoutSession(session.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Aperçu Conversations Récentes */}
        {clientConversations.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={18} />
              Dernières Conversations
            </h3>
            <div className="space-y-3">
              {clientConversations.map((conv, idx) => (
                <div key={idx} className="border-l-4 border-gray-200 pl-4 py-2">
                  <p className="text-sm font-medium text-gray-900">📱 {conv.phone?.replace(/@.*/, '')}</p>
                  {conv.messages?.slice(-1).map((msg, i) => (
                    <p key={i} className="text-xs text-gray-500 mt-1">
                      {msg.text?.substring(0, 80)}...
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    );
  }

  // ==========================================
  // VUE GRILLE CLIENTS (Vue par défaut)
  // ==========================================
  const testFlowiseAgent = async (clientId) => {
    toast.loading('Test de l\'agent...', { duration: 1000 });
    try {
      const res = await axios.post('/api/test-flowise', { clientId, question: "Bonjour, êtes-vous disponible ?" });
      toast.success(`Agent répond : ${res.data.response.substring(0, 50)}...`);
    } catch (err) {
      toast.error('Agent non disponible');
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Sélectionnez un client pour voir ses détails et connexions.</p>
        </div>
        <button 
          onClick={() => setShowClientForm(!showClientForm)}
          className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} />
          Nouveau Client
        </button>
      </div>

      {/* Form Création Client */}
      {showClientForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 animate-in slide-in-from-top-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Créer un Client</h3>
          <form onSubmit={handleCreateClient} className="flex gap-4">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Nom de l'entreprise..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black"
              autoFocus
            />
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700">
              Créer
            </button>
            <button type="button" onClick={() => setShowClientForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm">
              Annuler
            </button>
          </form>
        </div>
      )}

      {/* Grille Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(client => {
          const clientSessions = sessions.filter(s => s.id.startsWith(client.id));
          const hasActiveSession = clientSessions.some(s => s.status === 'connected');

          return (
            <div 
              key={client.id}
              onClick={() => onClientSelect(client)}
              className="group relative p-6 rounded-lg border border-gray-200 bg-white hover:border-black hover:shadow-lg cursor-pointer transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold text-lg">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-black">{client.name}</h4>
                    <p className="text-xs text-gray-500">ID: {client.id}</p>
                  </div>
                </div>
                {hasActiveSession && (
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" title="Session active"></span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1">
                  <Smartphone size={14} />
                  {clientSessions.length} session(s)
                </span>
                <button 
                  onClick={(e) => handleDeleteClient(e, client.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="absolute inset-0 border-2 border-transparent group-hover:border-black rounded-lg pointer-events-none transition-all"></div>
            </div>
          );
        })}

        {/* Carte Ajouter */}
        <div 
          onClick={() => setShowClientForm(true)}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black cursor-pointer transition-all min-h-[140px]"
        >
          <Plus size={28} className="mb-2" />
          <span className="text-sm font-medium">Ajouter un client</span>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;

# 🤖 Brain WhatsApp - Multi-Client SaaS Bot

Automatisation WhatsApp avec Flowise AI pour plusieurs clients.

---

## 📋 Fonctionnalités

- ✅ Bot WhatsApp avec IA Flowise
- ✅ Multi-clients (chaque client = bot + catalogue)
- ✅ Gestion panier e-commerce
- ✅ Dashboard web temps réel

---

## 📁 Structure
```
bot-whatsapp/
├── backend/
│   ├── server.js                 # Serveur principal
│   ├── services/
│   │   ├── client.service.js     # Gestion clients
│   │   ├── session.service.js    # Sessions & panier
│   │   └── flowise-service.js    # Appels Flowise
│   └── data/clients/
│       └── lattafa/              # Exemple client
│           ├── config.json       # Config + Flowise API
│           ├── catalog.json      # Produits
│           └── conversations.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── components/
    │       ├── QRSection.jsx
    │       ├── Conversations.jsx
    │       ├── CatalogEditor.jsx
    │       └── ClientSelector.jsx
    └── package.json
```

---

## 🚀 Installation

### 1. Cloner
```bash
git clone https://github.com/AlFaris74/bot-whatsapp.git
cd bot-whatsapp
```

### 2. Créer .env
Créer `backend/.env` :
```env
# Configuration Brain WhatsApp

# Server Config
PORT=3000
NODE_ENV=development

# Paths
CATALOG_PATH=./data/catalog.json
CONVERSATIONS_PATH=./data/conversations.json

# Frontend URL (pour CORS)
FRONTEND_URL=http://localhost:5173

# Flowise API - Assistant Brain
FLOWISE_ENDPOINT=https://cloud.flowiseai.com/api/v1/prediction/VOTRE-CHATFLOW-ID
FLOWISE_TOKEN=
```

### 3. Installer Backend
```bash
cd backend
npm install
```

### 4. Installer Frontend
```bash
cd ../frontend
npm install
```

---

## 🎮 Lancement

### Backend
```bash
cd backend
npm start
```

### Frontend (nouveau terminal)
```bash
cd frontend
npm run dev
```

Accéder : **http://localhost:5173**

---

## 📱 Connexion WhatsApp

1. Ouvrir http://localhost:5173
2. Scanner le QR code avec WhatsApp
3. WhatsApp → Menu → "Appareils liés" → Scanner

✅ Connecté !

---

## ⚙️ Connecter 

### Créer Assistant Flowise

**Cloud** : https://cloud.flowiseai.com
1. Créer compte
2. "Add New" → Chatflow
3. Récupérer API Endpoint
4. Copier l'URL dans `.env` → `FLOWISE_ENDPOINT`

**Local** (recommandé) :
```bash
npm install -g flowise
npx flowise start
```

### Configurer Client

Éditer `backend/data/clients/VOTRE-CLIENT/config.json` :
```json
{
  "id": "votre-client",
  "name": "Votre Entreprise",
  "phone": "212XXXXXXXXX",
  "flowise": {
    "apiUrl": "https://cloud.flowiseai.com/api/v1/prediction/CHATFLOW_ID"
  }
}
```

Créer `catalog.json` :
```json
{
  "products": [
    {
      "id": "prod-1",
      "name": "Produit",
      "price": 299,
      "description": "Description",
      "stock": 50
    }
  ]
}
```

Créer `conversations.json` :
```json
{
  "conversations": {}
}
```

Redémarrer : `npm start`

---

## 🔐 Fichiers Non Inclus

Ces fichiers se génèrent automatiquement ou doivent être créés :

- `backend/.env` → **À créer manuellement** (voir ci-dessus)
- `backend/auth_info_baileys/` → Session WhatsApp (auto)
- `backend/data/clients/*/conversations.json` → Historique (auto)
- `node_modules/` → Dépendances (npm install)

---

## 🐛 Problèmes

### WhatsApp déconnecté
```bash
cd backend
rm -rf auth_info_baileys
npm start
```

### Flowise limit exceeded
Utiliser Flowise local :
```bash
npx flowise start
```

---

## 📞 Support

**Développé par Brain Solutions**
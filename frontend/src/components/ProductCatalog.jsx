import React, { useState, useEffect } from 'react';
import { Save, Trash, Plus, Search, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ProductCatalog = ({ preSelectedClientId }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClient] = useState(preSelectedClientId || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (preSelectedClientId) {
      setSelectedClient(preSelectedClientId);
    }
  }, [preSelectedClientId]);

  useEffect(() => {
    if (selectedClientId) {
      loadCatalog(selectedClientId);
    } else {
      setProducts([]);
    }
  }, [selectedClientId]);

  const loadClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data.clients || []);
      // Si pas de pre-selection, on prend le premier
      if (!preSelectedClientId && res.data.clients.length > 0 && !selectedClientId) {
         // On ne force pas la selection si on veut laisser l'utilisateur choisir
      }
    } catch (e) { console.error(e); }
  };

  const loadCatalog = async (clientId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/clients/${clientId}/catalog`);
      setProducts(res.data.catalog.products || []);
    } catch (e) {
      console.error(e);
      setProducts([]);
      toast.error("Impossible de charger le catalogue");
    } finally {
      setLoading(false);
    }
  };

  const saveCatalog = async (newProducts) => {
    try {
      await axios.put(`/api/clients/${selectedClientId}/catalog`, { products: newProducts });
      setProducts(newProducts);
      toast.success("Catalogue sauvegardé");
    } catch (e) {
      toast.error("Erreur sauvegarde");
    }
  };

  const handleAddProduct = () => {
    const newProd = {
      id: `prod-${Date.now()}`,
      name: 'Nouveau Produit',
      price: 0,
      description: '',
      stock: 10
    };
    saveCatalog([...products, newProd]);
  };

  const handleUpdateProduct = (id, field, value) => {
    const updated = products.map(p => p.id === id ? { ...p, [field]: value } : p);
    setProducts(updated); 
  };

  const handleBlur = () => {
    saveCatalog(products);
  };

  const handleDelete = (id) => {
    if(confirm('Supprimer ce produit ?')) {
      saveCatalog(products.filter(p => p.id !== id));
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedClientId) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertCircle size={48} className="mb-4 opacity-20" />
              <p>Veuillez sélectionner un client pour voir son catalogue.</p>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalogue Produits</h1>
          <p className="text-gray-500 mt-1">
            {products.length} produits référencés
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Selecteur de client (caché si pré-sélectionné) */}
           {!preSelectedClientId && (
             <select 
              value={selectedClientId} 
              onChange={(e) => setSelectedClient(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm text-sm p-2 border"
             >
               <option value="">-- Choisir Client --</option>
               {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           )}

           <button 
            onClick={handleAddProduct}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
           >
             <Plus size={16} />
             Ajouter Produit
           </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50">
           <div className="relative flex-1 max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input 
              type="text" 
              placeholder="Rechercher un produit..." 
              className="pl-10 w-full border-gray-200 rounded-md text-sm focus:ring-black focus:border-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>

        {loading ? (
            <div className="p-8 text-center">Chargement...</div>
        ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Prix (Dhs)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Stock</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                        <input 
                        type="text" 
                        value={product.name}
                        onChange={(e) => handleUpdateProduct(product.id, 'name', e.target.value)}
                        onBlur={handleBlur}
                        className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 focus:ring-0 focus:border-b focus:border-black placeholder-gray-300"
                        placeholder="Nom du produit"
                        />
                    </td>
                    <td className="px-6 py-4">
                        <input 
                        type="text" 
                        value={product.description}
                        onChange={(e) => handleUpdateProduct(product.id, 'description', e.target.value)}
                        onBlur={handleBlur}
                        className="w-full border-0 bg-transparent p-0 text-sm text-gray-500 focus:ring-0 focus:border-b focus:border-black placeholder-gray-300"
                        placeholder="Description..."
                        />
                    </td>
                    <td className="px-6 py-4">
                        <input 
                        type="number" 
                        value={product.price}
                        onChange={(e) => handleUpdateProduct(product.id, 'price', parseFloat(e.target.value))}
                        onBlur={handleBlur}
                        className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0 focus:border-b focus:border-black"
                        />
                    </td>
                    <td className="px-6 py-4">
                        <input 
                        type="number" 
                        value={product.stock}
                        onChange={(e) => handleUpdateProduct(product.id, 'stock', parseInt(e.target.value))}
                        onBlur={handleBlur}
                        className="w-full border-0 bg-transparent p-0 text-sm text-gray-900 focus:ring-0 focus:border-b focus:border-black"
                        />
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button 
                        onClick={() => handleDelete(product.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                        <Trash size={16} />
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        
        {filteredProducts.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <p>Aucun produit dans ce catalogue.</p>
                <button onClick={handleAddProduct} className="text-emerald-600 font-medium mt-2 hover:underline">
                    Ajouter le premier produit
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ProductCatalog;

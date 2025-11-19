import React, { useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Menu,
  Plus,
  LayoutDashboard,
  Package
} from 'lucide-react';
import logo from '../BLight.png';

const Layout = ({ children, activeTab, onTabChange }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
    { id: 'chat', icon: MessageSquare, label: 'Conversations' },
    { id: 'leads', icon: Package, label: 'Commandes' },
    { id: 'catalog', icon: ShoppingBag, label: 'Catalogue' },
    { id: 'settings', icon: Settings, label: 'Paramètres' },
  ];

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800">
      {/* Sidebar Style OpenAI (Dark) */}
      <div 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } bg-[#202123] text-white transition-all duration-300 flex flex-col overflow-hidden`}
      >
        {/* Logo Section - Modified per request */}
        <div className="p-6 flex items-center justify-center border-b border-white/10 h-20">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>

        <div className="flex-1 py-6 px-3 space-y-1">
          <div className="mb-8 px-2">
             <button className="w-full flex items-center gap-3 px-3 py-3 rounded-md border border-white/20 hover:bg-gray-700 transition-colors text-sm text-left shadow-sm text-white">
              <Plus size={16} />
              <span>Nouvelle Session</span>
            </button>
          </div>

          <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wider">
            Menu
          </div>
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                activeTab === item.id 
                  ? 'bg-[#343541] text-white font-medium' 
                  : 'text-gray-400 hover:bg-[#2A2B32] hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 text-gray-400 hover:text-white text-sm w-full transition-colors px-2 py-2">
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Mobile Header */}
        <header className="h-14 border-b border-gray-100 flex items-center px-4 justify-between lg:hidden">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600">
             <Menu size={24} />
           </button>
           <div className="w-8"></div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-10 bg-white relative">
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

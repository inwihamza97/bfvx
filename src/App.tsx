import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  LayoutDashboard,
  Plus,
  Search,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Supplier, Article, Purchase, PurchaseType, Client, Sale, SaleType } from './types';

// Components
import SupplierList from './components/SupplierList';
import ClientList from './components/ClientList';
import ArticleList from './components/ArticleList';
import PurchaseList from './components/PurchaseList';
import SaleList from './components/SaleList';
import Sidebar from './components/Sidebar';

export type View = 'dashboard' | 'achat' | 'vente' | 'stock' | 'article' | 'fournisseur' | 'client' | 
  'achat-commande' | 'achat-reception' | 'achat-facture' | 'achat-avoir' | 'achat-archive' |
  'vente-commande' | 'vente-livraison' | 'vente-facture' | 'vente-avoir' | 'vente-archive';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // State for persistent data (Mocked)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('suppliers');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('clients');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('articles');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('purchases');
    return saved ? JSON.parse(saved) : [];
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('sales');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('clients', JSON.stringify(clients));
  }, [clients]);
  
  useEffect(() => {
    localStorage.setItem('articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="bg-brand-surface p-8 rounded-lg border border-brand-border">
              <h1 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-brand-accent pl-3 mb-6">Tableau de bord</h1>
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6">
                <StatCard label="Achats" value={purchases.filter(p => !p.isArchived).length} icon={<ShoppingBag size={20} />} color="text-violet-600 bg-violet-50" />
                <StatCard label="Ventes" value={sales.filter(s => !s.isArchived).length} icon={<TrendingUp size={20} />} color="text-emerald-600 bg-emerald-50" />
                <StatCard label="Articles" value={articles.length} icon={<Package size={20} />} color="text-indigo-600 bg-indigo-50" />
                <StatCard label="Clients" value={clients.length} icon={<Users size={20} />} color="text-blue-600 bg-blue-50" />
                <StatCard label="Fournisseurs" value={suppliers.length} icon={<Users size={20} />} color="text-amber-600 bg-amber-50" />
              </div>
            </div>
          </div>
        );
      case 'fournisseur':
        return (
          <SupplierList 
            suppliers={suppliers} 
            setSuppliers={setSuppliers} 
            onViewArticles={(s) => {
              setSelectedSupplierId(s.id);
              setCurrentView('article');
            }}
          />
        );
      case 'article':
        return (
          <ArticleList 
            articles={articles} 
            suppliers={suppliers}
            setArticles={setArticles} 
            supplierId={selectedSupplierId || undefined}
            mode="articles"
            onBack={() => {
              setCurrentView('fournisseur');
              setSelectedSupplierId(null);
            }}
          />
        );
      case 'client':
        return (
          <ClientList 
            clients={clients} 
            setClients={setClients} 
          />
        );
      case 'stock':
        return (
          <ArticleList 
            articles={articles} 
            suppliers={suppliers}
            setArticles={setArticles} 
            mode="stock"
          />
        );
      case 'achat':
      case 'achat-commande':
      case 'achat-reception':
      case 'achat-facture':
      case 'achat-avoir':
      case 'achat-archive':
        const getFilterTypeAchat = (): PurchaseType | 'all' => {
          if (currentView === 'achat-commande') return 'Commande';
          if (currentView === 'achat-reception') return 'Bon de reception';
          if (currentView === 'achat-facture') return 'Facture';
          if (currentView === 'achat-avoir') return 'Avoir';
          return 'all';
        };
        return (
          <PurchaseList 
            purchases={purchases} 
            setPurchases={setPurchases}
            articles={articles}
            setArticles={setArticles}
            suppliers={suppliers}
            filterType={getFilterTypeAchat()}
            showArchived={currentView === 'achat-archive'}
          />
        );
      case 'vente':
      case 'vente-commande':
      case 'vente-livraison':
      case 'vente-facture':
      case 'vente-avoir':
      case 'vente-archive':
        const getFilterTypeVente = (): SaleType | 'all' => {
          if (currentView === 'vente-commande') return 'Commande';
          if (currentView === 'vente-livraison') return 'Bon de livraison';
          if (currentView === 'vente-facture') return 'Facture';
          if (currentView === 'vente-avoir') return 'Avoir';
          return 'all';
        };
        return (
          <SaleList 
            sales={sales} 
            setSales={setSales}
            articles={articles}
            setArticles={setArticles}
            clients={clients}
            filterType={getFilterTypeVente()}
            showArchived={currentView === 'vente-archive'}
          />
        );
      default:
        return <div>View not implemented</div>;
    }
  };

  const getViewLabel = (view: View) => {
    const labels: Record<string, string> = {
      'dashboard': 'Tableau de Bord',
      'fournisseur': 'Fournisseurs',
      'client': 'Clients',
      'stock': 'Stock & Inventaire',
      'article': 'Fournisseurs / Catalogue Articles',
      'achat': 'Achats',
      'achat-commande': 'Achats / Commandes',
      'achat-reception': 'Achats / Bons de réception',
      'achat-facture': 'Achats / Factures',
      'achat-avoir': 'Achats / Avoirs',
      'achat-archive': 'Achats / Journal (Tous)',
      'vente': 'Ventes',
      'vente-commande': 'Ventes / Commandes',
      'vente-livraison': 'Ventes / Bons de livraison',
      'vente-facture': 'Ventes / Factures',
      'vente-avoir': 'Ventes / Avoirs',
      'vente-archive': 'Ventes / Journal (Tous)',
    };
    return labels[view] || view;
  };

  return (
    <div className="flex min-h-screen bg-brand-bg font-sans text-brand-ink">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onNavigateToArticles={() => {
          setSelectedSupplierId(null);
          setCurrentView('article');
        }}
      />
      
      <main className="flex-1 ml-[240px] flex flex-col h-screen overflow-hidden bg-[#fcfcfb]">
        <header className="h-[72px] px-8 flex justify-between items-center bg-brand-surface border-b border-brand-border shrink-0">
          <div className="text-[13px] text-brand-muted font-medium">
            {getViewLabel(currentView)} / <span className="text-brand-ink font-bold">Management</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[14px] font-semibold">Admin Business</div>
            <div className="w-9 h-9 rounded-full bg-brand-header border border-brand-border" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-md", color)}>
          {icon}
        </div>
        <p className="text-[12px] text-brand-muted font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-brand-ink mt-2">{value}</p>
    </div>
  );
}


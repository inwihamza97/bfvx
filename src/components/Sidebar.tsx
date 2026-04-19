import React from 'react';
import { 
  Users, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  LayoutDashboard,
  Box,
  ChevronDown,
  Archive
} from 'lucide-react';
import { cn } from '../lib/utils';
import { View } from '../App';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onNavigateToArticles: () => void;
}

export default function Sidebar({ currentView, setCurrentView, onNavigateToArticles }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { 
      id: 'fournisseur', 
      label: 'Fournisseurs', 
      icon: Users,
      subItems: [
        { id: 'fournisseur', label: 'Liste Fournisseurs' },
        { id: 'article', label: 'Catalogue Articles', onSelect: onNavigateToArticles },
      ]
    },
    { id: 'client', label: 'Clients', icon: Users },
    { id: 'stock', label: 'Stock & Inventaire', icon: Package },
    { 
      id: 'achat', 
      label: 'Achats', 
      icon: ShoppingBag,
      color: 'violet',
      subItems: [
        { id: 'achat-commande', label: 'Commandes', theme: 'sky' },
        { id: 'achat-reception', label: 'Bons de réception', theme: 'amber' },
        { id: 'achat-facture', label: 'Factures', theme: 'emerald' },
        { id: 'achat-avoir', label: 'Avoirs', theme: 'rose' },
        { id: 'achat-archive', label: 'Journal (Tous)', theme: 'violet' },
      ]
    },
    { 
      id: 'vente', 
      label: 'Ventes', 
      icon: TrendingUp, 
      color: 'emerald',
      subItems: [
        { id: 'vente-commande', label: 'Commandes', theme: 'sky' },
        { id: 'vente-livraison', label: 'Bons de livraison', theme: 'amber' },
        { id: 'vente-facture', label: 'Factures', theme: 'emerald' },
        { id: 'vente-avoir', label: 'Avoirs', theme: 'rose' },
        { id: 'vente-archive', label: 'Journal (Tous)', theme: 'emerald' },
      ]
    },
  ];

  return (
    <aside className="w-[240px] bg-brand-surface border-r border-brand-border h-screen fixed left-0 top-0 flex flex-col z-10">
      <div className="p-6 font-bold text-lg leading-tight tracking-tight flex items-center gap-3">
        <div className="w-9 h-9 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
          <Box size={20} />
        </div>
        <span className="text-brand-ink uppercase tracking-wider text-[15px]">Lumina <span className="text-brand-accent">ERP</span></span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentView === item.id || item.subItems?.some(s => s.id === currentView);
          const colorClass = item.color === 'violet' 
            ? (isActive ? (item.subItems && currentView !== item.id ? "text-violet-600 bg-violet-50" : "bg-violet-600 text-white shadow-md shadow-violet-200") : "text-brand-muted hover:bg-violet-50 hover:text-violet-600")
            : item.color === 'emerald'
            ? (isActive ? (item.subItems && currentView !== item.id ? "text-emerald-600 bg-emerald-50" : "bg-emerald-600 text-white shadow-md shadow-emerald-200") : "text-brand-muted hover:bg-emerald-50 hover:text-emerald-600")
            : (isActive ? (item.subItems && currentView !== item.id ? "text-brand-accent bg-brand-accent-light/50" : "bg-brand-accent text-white shadow-md shadow-brand-accent/10") : "text-brand-muted hover:bg-brand-accent-light hover:text-brand-accent");
          
          const iconColorClass = item.color === 'violet'
            ? (isActive ? (item.subItems && currentView !== item.id ? "text-violet-600" : "text-white") : "text-brand-muted group-hover:text-violet-600")
            : item.color === 'emerald'
            ? (isActive ? (item.subItems && currentView !== item.id ? "text-emerald-600" : "text-white") : "text-brand-muted group-hover:text-emerald-600")
            : (isActive ? (item.subItems && currentView !== item.id ? "text-brand-accent" : "text-white") : "text-brand-muted group-hover:text-brand-accent");

          return (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => {
                  if ((item as any).onSelect) {
                    (item as any).onSelect();
                  } else if (item.subItems) {
                    if (currentView !== item.id) setCurrentView(item.id as View);
                  } else {
                    setCurrentView(item.id as View);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 transition-all duration-200 font-semibold text-[13px] rounded-xl group",
                  colorClass
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={cn(
                    "transition-colors",
                    iconColorClass
                  )} />
                  {item.label}
                </div>
                {item.subItems && (
                  <ChevronDown 
                    size={14} 
                    className={cn(
                      "transition-transform duration-200",
                      isActive ? "transform rotate-0" : "transform -rotate-90"
                    )} 
                  />
                )}
              </button>
              
              {item.subItems && isActive && (
                <div className="pl-9 space-y-1 mt-1">
                  {item.subItems.map((sub) => {
                    const theme = (sub as any).theme;
                    let subColorClass = "text-brand-muted hover:bg-slate-50";
                    
                    if (currentView === sub.id) {
                      if (theme === 'sky') subColorClass = "text-sky-600 bg-sky-50 font-bold";
                      else if (theme === 'amber') subColorClass = "text-amber-600 bg-amber-50 font-bold";
                      else if (theme === 'emerald') subColorClass = "text-emerald-600 bg-emerald-50 font-bold";
                      else if (theme === 'rose') subColorClass = "text-rose-600 bg-rose-50 font-bold";
                      else subColorClass = "text-violet-600 bg-violet-50 font-bold";
                    } else {
                      if (theme === 'sky') subColorClass = "text-brand-muted hover:text-sky-600 hover:bg-sky-50/30";
                      else if (theme === 'amber') subColorClass = "text-brand-muted hover:text-amber-600 hover:bg-amber-50/30";
                      else if (theme === 'emerald') subColorClass = "text-brand-muted hover:text-emerald-600 hover:bg-emerald-50/30";
                      else if (theme === 'rose') subColorClass = "text-brand-muted hover:text-rose-600 hover:bg-rose-50/30";
                      else subColorClass = "text-brand-muted hover:text-violet-600 hover:bg-violet-50/30";
                    }
                    
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          if ((sub as any).onSelect) {
                            (sub as any).onSelect();
                          } else {
                            setCurrentView(sub.id as View);
                          }
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[12px] font-semibold rounded-lg transition-colors",
                          subColorClass
                        )}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto p-4 mx-3 mb-6 bg-brand-bg rounded-2xl border border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-accent font-bold text-xs border border-brand-border shadow-sm">
            AB
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-brand-ink">Admin Business</p>
            <p className="text-[10px] text-brand-muted font-medium uppercase tracking-wider">Plan Pro • v1.0.4</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

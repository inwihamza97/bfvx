import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Edit, Save, X, FileText, 
  Calendar, CheckSquare, Square, Tag, ShoppingBag,
  ChevronDown, Archive, RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import { Purchase, PurchaseType, Supplier, Article, PurchaseItem } from '../types';
import { cn, calculateFromTTC, getNextReference } from '../lib/utils';
import { format } from 'date-fns';
import { generatePurchasePDF } from '../services/pdfService';

interface PurchaseListProps {
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  suppliers: Supplier[];
  filterType?: PurchaseType | 'all';
  showArchived?: boolean;
}

export default function PurchaseList({ 
  purchases, 
  setPurchases, 
  articles, 
  setArticles, 
  suppliers, 
  filterType = 'all', 
  showArchived = false 
}: PurchaseListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // New Purchase State
  const [type, setType] = useState<PurchaseType>('Commande');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedItems, setSelectedItems] = useState<Record<string, PurchaseItem>>({});
  const [isValidated, setIsValidated] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [globalPrice, setGlobalPrice] = useState<string>('');

  useEffect(() => {
    if (filterType !== 'all' && filterType !== 'Avoir' && !editingId) {
      setType(filterType);
    }
  }, [filterType, editingId]);

  const types: PurchaseType[] = ['Commande', 'Bon de reception', 'Facture', 'Avoir'];

  // Filter articles based on selected suppliers
  const availableArticles = useMemo(() => {
    if (selectedSupplierIds.length === 0) return [];
    return articles.filter(a => selectedSupplierIds.includes(a.supplierId));
  }, [articles, selectedSupplierIds]);

  const handleToggleSupplier = (id: string) => {
    setSelectedSupplierIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleToggleArticle = (article: Article) => {
    setSelectedItems(prev => {
      if (prev[article.id]) {
        const next = { ...prev };
        delete next[article.id];
        return next;
      }
      return {
        ...prev,
        [article.id]: {
          articleId: article.id,
          reference: article.reference,
          name: article.name,
          quantity: 1,
          unitPriceHT: 0,
          tvaRate: 0.20,
          priceTTC: 0
        }
      };
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (checked) {
        availableArticles.forEach(article => {
          if (!next[article.id]) {
            next[article.id] = {
              articleId: article.id,
              reference: article.reference,
              name: article.name,
              quantity: 1,
              unitPriceHT: 0,
              tvaRate: 0.20,
              priceTTC: 0
            };
          }
        });
      } else {
        availableArticles.forEach(article => {
          delete next[article.id];
        });
      }
      return next;
    });
  };

  const updateItem = (articleId: string, ttc: number, qty: number) => {
    const { ht } = calculateFromTTC(ttc);
    setSelectedItems(prev => ({
      ...prev,
      [articleId]: {
        ...prev[articleId],
        quantity: qty,
        unitPriceHT: ht,
        priceTTC: ttc
      }
    }));
  };

  const applyGlobalPrice = () => {
    const price = parseFloat(globalPrice);
    if (isNaN(price)) return;

    setSelectedItems(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        const { ht } = calculateFromTTC(price);
        next[id] = {
          ...next[id],
          unitPriceHT: ht,
          priceTTC: price
        };
      });
      return next;
    });
  };

  const totalTTC = (Object.values(selectedItems) as PurchaseItem[]).reduce((acc, item) => acc + (item.priceTTC * item.quantity), 0);

  const handleEdit = (purchase: Purchase) => {
    setType(purchase.type);
    setSelectedSupplierIds(purchase.supplierIds);
    setDate(purchase.date);
    const itemsMap: Record<string, PurchaseItem> = {};
    purchase.items.forEach(item => {
      itemsMap[item.articleId] = item;
    });
    setSelectedItems(itemsMap);
    setIsValidated(purchase.isValidated || false);
    setIsSettled(purchase.isSettled || false);
    setEditingId(purchase.id);
    setIsAdding(true);
  };

  const updateStockOnValidation = (items: PurchaseItem[]) => {
    setArticles(prev => prev.map(article => {
      const item = items.find(i => i.articleId === article.id);
      if (item) {
        return { ...article, stock: (article.stock || 0) + item.quantity };
      }
      return article;
    }));
  };

  const handleSave = () => {
    if (selectedSupplierIds.length === 0 || Object.keys(selectedItems).length === 0) {
      alert('Veuillez sélectionner au moins un fournisseur et un article.');
      return;
    }

    let finalType = type;
    let finalValidated = isValidated;
    const existing = purchases.find(p => p.id === editingId);

    // Traceability: If validating and triggers a type change, keep original and create new
    if (isValidated && (type === 'Commande' || type === 'Bon de reception')) {
      const transitionTargetType: PurchaseType = type === 'Commande' ? 'Bon de reception' : 'Facture';
      
      // 1. Current Document (Validated version of the source)
      const currentDocRef = editingId && existing 
        ? existing.customReference 
        : getNextReference(type, purchases.map(p => p.customReference));

      const currentDoc: Purchase = {
        id: editingId || crypto.randomUUID(),
        customReference: currentDocRef,
        type: type,
        supplierIds: selectedSupplierIds,
        date,
        items: Object.values(selectedItems) as PurchaseItem[],
        totalTTC,
        isValidated: true,
        isSettled: isSettled,
        isArchived: true, // Auto-archive the "old stage" document so it leaves the active list
        stockUpdated: existing?.stockUpdated || false,
        createdAt: existing?.createdAt || new Date().toISOString()
      };

      // Update Stock if we validated a Bon de réception or Facture and it hasn't been updated yet
      if ((type === 'Bon de reception' || type === 'Facture') && !currentDoc.stockUpdated) {
        updateStockOnValidation(currentDoc.items);
        currentDoc.stockUpdated = true;
      }

      // 2. Transitioned Document (New one for next stage)
      const nextRef = getNextReference(transitionTargetType, [...purchases, currentDoc].map(p => p.customReference));
      const nextDoc: Purchase = {
        ...currentDoc,
        id: crypto.randomUUID(),
        customReference: nextRef,
        type: transitionTargetType,
        isValidated: false,
        isSettled: (type === 'Bon de reception' || type === 'Facture') ? isSettled : false,
        isArchived: false,
        stockUpdated: currentDoc.stockUpdated, // Inherit stock update status
        createdAt: new Date().toISOString()
      };

      if (editingId) {
        setPurchases(prev => [nextDoc, ...prev.map(p => p.id === editingId ? currentDoc : p)]);
      } else {
        setPurchases(prev => [nextDoc, currentDoc, ...prev]);
      }
    } else {
      // Standard Save (New or update without transition)
      let finalReference = existing?.customReference || '';
      
      if (!editingId || (existing && existing.type !== finalType)) {
        finalReference = getNextReference(finalType, purchases.map(p => p.customReference));
      }

      const purchaseData: Purchase = {
        id: editingId || crypto.randomUUID(),
        customReference: finalReference,
        type: finalType,
        supplierIds: selectedSupplierIds,
        date,
        items: Object.values(selectedItems) as PurchaseItem[],
        totalTTC,
        isValidated: finalValidated,
        isSettled: isSettled,
        isArchived: existing?.isArchived || false,
        stockUpdated: existing?.stockUpdated || false,
        createdAt: existing?.createdAt || new Date().toISOString()
      };

      // Update Stock in Standard Save if just validated and is correct type
      if (finalValidated && !purchaseData.stockUpdated && (finalType === 'Bon de reception' || finalType === 'Facture')) {
        updateStockOnValidation(purchaseData.items);
        purchaseData.stockUpdated = true;
      }

      if (editingId) {
        setPurchases(purchases.map(p => p.id === editingId ? purchaseData : p));
      } else {
        setPurchases([purchaseData, ...purchases]);
      }
    }

    setIsAdding(false);
    setEditingId(null);
    setIsValidated(false);
    setIsSettled(false);
    // Reset state
    setSelectedSupplierIds([]);
    setSelectedItems({});
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleArchive = (id: string, archive: boolean = true) => {
    setPurchases(purchases.map(p => p.id === id ? { ...p, isArchived: archive } : p));
  };

  const handleDelete = (id: string) => {
    setPurchases(purchases.filter(p => p.id !== id));
  };

  const handleConvertToAvoir = (id: string) => {
    console.log("Converting document to Avoir:", id);
    const sourceDoc = purchases.find(p => p.id === id);
    if (!sourceDoc) return;

    const nextRef = getNextReference('Avoir', purchases.map(x => x.customReference));
    const avoirDoc: Purchase = {
      ...sourceDoc,
      id: crypto.randomUUID(),
      customReference: nextRef,
      type: 'Avoir',
      isValidated: true,
      createdAt: new Date().toISOString()
    };

    // We mark the original doc as archived and add the new Avoir
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, isArchived: true } : p).concat(avoirDoc));

    // Close editor if open
    setIsAdding(false);
    setEditingId(null);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setEditingId(null);
    setIsValidated(false);
    setIsSettled(false);
    setSelectedSupplierIds([]);
    setSelectedItems({});
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const filteredPurchases = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return purchases.filter(p => {
      // Archive Filter
      // If showArchived is true, we show EVERYTHING (Global History)
      if (!showArchived && p.isArchived) return false;

      // Type Filter (from Props)
      if (filterType !== 'all' && p.type !== filterType) return false;

      // Date Range Filter
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;

      // Text Filter
      const formattedDate = format(new Date(p.date), 'dd/MM/yyyy');
      const supplierNames = p.supplierIds.map(sid => suppliers.find(s => s.id === sid)?.name || '').join(' ').toLowerCase();
      const itemsInfo = p.items.map(item => `${item.reference} ${item.name}`).join(' ').toLowerCase();
      
      return (
        p.type.toLowerCase().includes(term) ||
        p.customReference.toLowerCase().includes(term) ||
        p.date.includes(term) ||
        formattedDate.includes(term) ||
        p.id.toLowerCase().includes(term) ||
        supplierNames.includes(term) ||
        itemsInfo.includes(term)
      );
    });
  }, [purchases, searchTerm, startDate, endDate, suppliers, filterType, showArchived]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-brand-border rounded-xl px-2 py-1.5 shadow-sm shrink-0">
            <div className="p-1.5 text-brand-muted">
              <Calendar size={16} />
            </div>
            <div className="flex items-center gap-2 pr-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-brand-muted uppercase leading-none px-1">Du</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-[12px] font-bold text-brand-ink h-5"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-px h-6 bg-brand-border mx-1" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-brand-muted uppercase leading-none px-1">Au</span>
                <input
                  type="date"
                  className="bg-transparent border-none focus:outline-none text-[12px] font-bold text-brand-ink h-5"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }} 
                className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors ml-1"
                title="Réinitialiser les dates"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {!showArchived && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl hover:bg-violet-700 font-medium text-sm transition-all"
          >
            <Plus size={18} />
            Nouvel Achat
          </button>
        )}
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-surface p-8 rounded-lg border border-brand-border space-y-8 shadow-sm"
        >
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-brand-accent pl-3">
              {editingId ? 'Modifier le Document' : 'Informations du Document'}
            </h3>
            <button onClick={cancelAdd} className="p-2 hover:bg-slate-100 rounded-full text-brand-muted">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Type Selection - Segmented Button Group */}
              <div>
                <label className="block text-[12px] font-bold text-brand-muted uppercase tracking-wider mb-2">Type d'Document *</label>
                <div className="flex gap-px bg-brand-border border border-brand-border rounded-md overflow-hidden">
                  {types.filter(t => t !== 'Avoir' || editingId).map(t => (
                    <button
                      key={t}
                      onClick={() => !editingId && setType(t)}
                      disabled={!!editingId}
                      className={cn(
                        "flex-1 py-2.5 px-3 text-[13px] font-bold transition-all",
                        type === t 
                        ? (
                          t === 'Commande' ? "bg-sky-600 text-white shadow-inner" :
                          t === 'Bon de reception' ? "bg-amber-600 text-white shadow-inner" :
                          t === 'Facture' ? "bg-emerald-600 text-white shadow-inner" :
                          t === 'Avoir' ? "bg-rose-600 text-white shadow-inner" :
                          "bg-violet-600 text-white shadow-inner"
                        )
                        : (
                          t === 'Commande' ? "bg-brand-surface text-brand-muted hover:bg-sky-50 hover:text-sky-600" :
                          t === 'Bon de reception' ? "bg-brand-surface text-brand-muted hover:bg-amber-50 hover:text-amber-600" :
                          t === 'Facture' ? "bg-brand-surface text-brand-muted hover:bg-emerald-50 hover:text-emerald-600" :
                          t === 'Avoir' ? "bg-brand-surface text-brand-muted hover:bg-rose-50 hover:text-rose-600" :
                          "bg-brand-surface text-brand-muted hover:bg-violet-50 hover:text-violet-600"
                        ),
                        editingId && type !== t && "opacity-50 grayscale cursor-not-allowed"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row grid grid-cols-2 gap-4">
                {/* Supplier Selection */}
                <div className="input-group flex flex-col gap-1.5">
                  <label>Fournisseur(s) *</label>
                  <div className="relative">
                    <select
                      className="w-full pl-3 pr-10 py-2.5 bg-brand-surface border border-brand-border rounded-md focus:ring-1 focus:ring-violet-500 outline-none text-[14px] appearance-none"
                      onChange={(e) => handleToggleSupplier(e.target.value)}
                      value=""
                    >
                      <option value="">Sélectionner...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" size={16} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedSupplierIds.map(sid => (
                      <span key={sid} className="bg-brand-accent-light text-brand-accent text-[11px] font-bold px-2 py-1 rounded border border-brand-accent/20 flex items-center gap-1">
                        {suppliers.find(s => s.id === sid)?.name}
                        <button onClick={() => handleToggleSupplier(sid)}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="input-group flex flex-col gap-1.5">
                  <label>Date d'émission *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 bg-brand-surface border border-brand-border rounded-md focus:ring-1 focus:ring-violet-500 outline-none text-[14px]"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-6 p-4 bg-brand-bg rounded-md border border-brand-border">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                    checked={isValidated}
                    onChange={(e) => setIsValidated(e.target.checked)}
                  />
                  <span className="text-xs font-bold text-brand-muted uppercase group-hover:text-brand-accent transition-colors">Validé</span>
                </label>

                {(type === 'Bon de reception' || type === 'Facture') && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                      checked={isSettled}
                      onChange={(e) => setIsSettled(e.target.checked)}
                    />
                    <span className="text-xs font-bold text-brand-muted uppercase group-hover:text-brand-accent transition-colors">Soldé</span>
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-brand-accent pl-3">
                Articles (Filtrés)
              </h3>
              <div className="bg-brand-header/50 rounded-md border border-brand-border max-h-[200px] overflow-y-auto">
                <table className="w-full text-left text-[13px]">
                  {availableArticles.length > 0 && (
                    <thead className="sticky top-0 bg-brand-header border-b border-brand-border z-10">
                      <tr>
                        <th className="px-3 py-2 w-10">
                          <input 
                            type="checkbox"
                            checked={availableArticles.every(a => !!selectedItems[a.id])}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                          />
                        </th>
                        <th colSpan={2} className="px-3 py-2 text-[10px] uppercase font-bold text-brand-muted">
                          Sélectionner tout ({availableArticles.length})
                        </th>
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-brand-border">
                    {availableArticles.map(article => (
                      <tr key={article.id} className="hover:bg-brand-surface">
                        <td className="px-3 py-2 w-10">
                          <input 
                            type="checkbox" 
                            checked={!!selectedItems[article.id]} 
                            onChange={() => handleToggleArticle(article)}
                            className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                          />
                        </td>
                        <td className="px-3 py-2 font-bold text-brand-ink">#{article.reference}</td>
                        <td className="px-3 py-2 text-brand-muted">{article.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {availableArticles.length === 0 && (
                  <div className="text-center py-8 text-brand-muted italic text-[12px]">
                    Sélectionnez un fournisseur pour voir ses articles
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Detail */}
          {Object.keys(selectedItems).length > 0 && (
            <div className="space-y-4 mt-8">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-brand-muted uppercase tracking-[0.05em] border-l-4 border-brand-accent pl-3">
                  Articles Sélectionnés
                </h3>
                
                <div className="flex items-center gap-2 bg-brand-bg p-2 rounded-md border border-brand-border">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Prix Fixe (TTC)</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-24 px-2 py-1 bg-white border border-brand-border rounded text-[13px] font-bold outline-none focus:ring-1 focus:ring-violet-500"
                    value={globalPrice}
                    onChange={(e) => setGlobalPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyGlobalPrice();
                      }
                    }}
                  />
                  <button 
                    onClick={applyGlobalPrice}
                    className="px-3 py-1 bg-violet-600 text-white text-[11px] font-bold rounded hover:bg-violet-700 transition-colors"
                  >
                    Appliquer à tous
                  </button>
                </div>
              </div>

              <div className="border border-brand-border rounded-md overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse bg-brand-surface">
                  <thead>
                    <tr className="bg-brand-header">
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Référence</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Désignation</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-24">Qté</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-28 text-right">PU (HT)</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-20 text-center">TVA</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-brand-muted uppercase tracking-wider w-32 text-right">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border text-[13px]">
                    {(Object.values(selectedItems) as PurchaseItem[]).map(item => (
                      <tr key={item.articleId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-brand-ink font-mono uppercase tracking-tight">
                          {item.reference}
                        </td>
                        <td className="px-4 py-3 text-brand-muted italic">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number"
                            min="1"
                            className="w-16 px-2 py-1 bg-white border border-brand-border rounded text-center font-bold focus:ring-1 focus:ring-violet-500 outline-none"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.articleId, item.priceTTC, parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-brand-muted font-mono">
                          {item.unitPriceHT.toFixed(2)} DH
                        </td>
                        <td className="px-4 py-3 text-center text-brand-muted font-bold">20%</td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number"
                            className="w-28 px-2 py-1 border border-violet-200 rounded text-right font-extrabold text-violet-600 bg-violet-50/30"
                            value={item.priceTTC}
                            onChange={(e) => updateItem(item.articleId, parseFloat(e.target.value) || 0, item.quantity)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end gap-12 mt-6 p-4 bg-brand-bg rounded-lg border border-brand-border">
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total HT</span>
                  <span className="text-[16px] font-bold text-brand-ink">
                    {(Object.values(selectedItems) as PurchaseItem[]).reduce((acc, item) => acc + (item.unitPriceHT * item.quantity), 0).toFixed(2)} DH
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total TVA (20%)</span>
                  <span className="text-[16px] font-bold text-brand-ink">
                    {(totalTTC - (Object.values(selectedItems) as PurchaseItem[]).reduce((acc, item) => acc + (item.unitPriceHT * item.quantity), 0)).toFixed(2)} DH
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-brand-muted uppercase">Total TTC</span>
                  <span className="text-[28px] font-black text-violet-600 tracking-tighter">
                    {totalTTC.toLocaleString()} DH
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-brand-border">
            {editingId && (type === 'Commande' || type === 'Bon de reception') && (
              <button 
                onClick={() => handleConvertToAvoir(editingId)}
                className="mr-auto px-6 py-2.5 rounded-lg text-sm font-bold text-brand-ink bg-slate-50 border border-brand-border hover:bg-violet-600 hover:border-violet-600 hover:text-white transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-violet-200"
              >
                <RotateCcw size={16} />
                Transférer en Avoir
              </button>
            )}
            <button 
              onClick={cancelAdd}
              className="px-6 py-2.5 rounded-md text-sm font-bold text-brand-muted hover:bg-slate-100 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={
                selectedSupplierIds.length === 0 || 
                Object.keys(selectedItems).length === 0 || 
                (Object.values(selectedItems) as PurchaseItem[]).some(item => item.priceTTC <= 0)
              }
              className={cn(
                "px-10 py-2.5 rounded-md text-[15px] font-extrabold transition-all",
                (selectedSupplierIds.length === 0 || Object.keys(selectedItems).length === 0 || (Object.values(selectedItems) as PurchaseItem[]).some(item => item.priceTTC <= 0))
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-violet-600 text-white shadow-lg shadow-violet-200 hover:bg-violet-700"
              )}
            >
              {editingId ? 'Mettre à jour' : 'Enregistrer l\'Achat'}
            </button>
          </div>
        </motion.div>
      )}

      {/* History List */}
      <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-header border-b border-brand-border">
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Référence</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Document</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Fournisseur(s)</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider">Statut</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider text-right">Montant TTC</th>
              <th className="px-6 py-4 text-[11px] font-bold text-brand-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border text-[13px]">
            {filteredPurchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-brand-muted">
                  {format(new Date(purchase.date), 'dd/MM/yyyy')}
                </td>
                <td className="px-6 py-4 font-mono font-bold text-brand-accent">
                  {purchase.customReference}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    purchase.type === 'Facture' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                    purchase.type === 'Avoir' ? "bg-rose-50 text-rose-600 border-rose-200" :
                    purchase.type === 'Commande' ? "bg-sky-50 text-sky-600 border-sky-200" :
                    "bg-amber-50 text-amber-600 border-amber-200"
                  )}>
                    {purchase.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {purchase.supplierIds.map((sid, idx) => (
                      <span key={sid} className="font-bold text-brand-ink">
                        {suppliers.find(s => s.id === sid)?.name}{idx < purchase.supplierIds.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {purchase.isValidated && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100/50 uppercase">
                        Validé
                      </span>
                    )}
                    {purchase.isSettled && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50 uppercase">
                        Soldé
                      </span>
                    )}
                    {!purchase.isValidated && !purchase.isSettled && (
                      <span className="text-[10px] text-brand-muted italic font-medium">En attente</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-black text-brand-accent">{purchase.totalTTC.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button 
                      onClick={(e) => {
                        console.log("PDF Button clicked for purchase:", purchase.id);
                        generatePurchasePDF(purchase, suppliers);
                      }}
                      className="p-2 text-sky-600 hover:bg-sky-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-sky-100 bg-white"
                      title="Télécharger PDF"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => handleEdit(purchase)}
                      disabled={purchase.type === 'Avoir' || (purchase.type === 'Facture' && purchase.isValidated && purchase.isSettled)}
                      className={cn(
                        "p-2 rounded-xl transition-all shadow-sm border bg-white",
                        (purchase.type === 'Avoir' || (purchase.type === 'Facture' && purchase.isValidated && purchase.isSettled))
                          ? "text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50 shadow-none" 
                          : "text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:shadow-md"
                      )}
                      title={
                        purchase.type === 'Avoir' 
                          ? "Document Avoir verrouillé" 
                          : (purchase.type === 'Facture' && purchase.isValidated && purchase.isSettled)
                            ? "Facture soldée verrouillée"
                            : "Modifier"
                      }
                    >
                      <Edit size={16} />
                    </button>
                    {!showArchived ? (
                      <button 
                        onClick={() => handleArchive(purchase.id, true)} 
                        className="p-2 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-amber-100 bg-white"
                        title="Archiver"
                      >
                        <Archive size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDelete(purchase.id)} 
                        className="p-2 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm hover:shadow-md border border-rose-100 bg-white"
                        title="Supprimer définitivement"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-brand-muted italic">
                  {searchTerm 
                    ? "Aucun document ne correspond à votre recherche" 
                    : showArchived
                      ? "Aucun document archivé"
                      : filterType !== 'all' 
                        ? `Aucun document de type "${filterType}" enregistré`
                        : "Aucun historique d'achat enregistré"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

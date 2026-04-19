export type PurchaseType = 'Commande' | 'Bon de reception' | 'Facture' | 'Avoir';
export type SaleType = 'Commande' | 'Bon de livraison' | 'Facture' | 'Avoir';

export interface Supplier {
  id: string;
  name: string;
  logo?: string;
}

export interface Client {
  id: string;
  name: string;
  logo?: string;
}

export interface Article {
  id: string;
  reference: string;
  name: string;
  supplierId: string;
  stock: number;
}

export interface PurchaseItem {
  articleId: string;
  reference: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number; // e.g. 0.20
  priceTTC: number;
}

export interface SaleItem {
  articleId: string;
  reference: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number; // e.g. 0.20
  priceTTC: number;
}

export interface Purchase {
  id: string;
  customReference: string;
  type: PurchaseType;
  supplierIds: string[]; // Supplier(s) selected
  date: string;
  items: PurchaseItem[];
  totalTTC: number;
  isValidated: boolean;
  isSettled: boolean;
  isArchived?: boolean;
  stockUpdated?: boolean;
  createdAt: string;
}

export interface Sale {
  id: string;
  customReference: string;
  type: SaleType;
  clientIds: string[]; // Client(s) selected
  date: string;
  items: SaleItem[];
  totalTTC: number;
  isValidated: boolean;
  isSettled: boolean;
  isArchived?: boolean;
  stockUpdated?: boolean;
  createdAt: string;
}

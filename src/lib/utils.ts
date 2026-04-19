import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateFromTTC(ttc: number, tvaRate: number = 0.20) {
  const ht = ttc / (1 + tvaRate);
  const tva = ttc - ht;
  return {
    ht: parseFloat(ht.toFixed(2)),
    tva: parseFloat(tva.toFixed(2)),
    ttc: parseFloat(ttc.toFixed(2))
  };
}

export function calculateFromHT(ht: number, tvaRate: number = 0.20) {
  const tva = ht * tvaRate;
  const ttc = ht + tva;
  return {
    ht: parseFloat(ht.toFixed(2)),
    tva: parseFloat(tva.toFixed(2)),
    ttc: parseFloat(ttc.toFixed(2))
  };
}

export function getNextReference(type: string, existingReferences: string[]): string {
  const prefixes: Record<string, string> = {
    'Commande': 'BC',
    'Bon de reception': 'BR',
    'Facture': 'FA',
    'Avoir': 'AV'
  };
  
  const prefix = prefixes[type] || 'DOC';
  
  // Find highest number for this prefix
  let lastNum = 0;
  existingReferences.forEach(ref => {
    if (ref && ref.startsWith(prefix)) {
      const numStr = ref.slice(prefix.length);
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > lastNum) {
        lastNum = num;
      }
    }
  });
  
  const nextNum = lastNum + 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

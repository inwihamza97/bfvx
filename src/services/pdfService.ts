import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Purchase, Supplier, Sale, Client } from '../types';
import { format } from 'date-fns';

export const generatePurchasePDF = (purchase: Purchase, suppliers: Supplier[]) => {
  console.log("Generating Purchase PDF for:", purchase.id);
  try {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header - User Business
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Brand Accent Blue
    doc.text('LUMINA BACKOFFICE', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Muted
    doc.text('123 Avenue des Entreprises', margin, 38);
    doc.text('75001 Paris, France', margin, 43);
    doc.text('contact@lumina.com', margin, 48);

    // Document Title & Info
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42); // Ink
    const title = purchase.type.toUpperCase();
    doc.text(title, 210 - margin, 30, { align: 'right' });
    
    doc.setDrawColor(226, 232, 240); // Border
    doc.line(margin, 55, 210 - margin, 55);

    // Supplier(s) Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATAIRE / FOURNISSEUR(S):', margin, 65);
    doc.setFont('helvetica', 'normal');
    
    let supplierY = 72;
    purchase.supplierIds.forEach(sid => {
      const s = suppliers.find(sup => sup.id === sid);
      if (s) {
        doc.text(s.name, margin, supplierY);
        supplierY += 5;
      }
    });

    // Date & Number
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU DOCUMENT:', 210 - margin, 65, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(purchase.date), 'dd/MM/yyyy')}`, 210 - margin, 72, { align: 'right' });
    doc.text(`Référence: ${purchase.customReference}`, 210 - margin, 77, { align: 'right' });
    if (purchase.isValidated) doc.text('Statut: VALIDÉ', 210 - margin, 82, { align: 'right' });
    if (purchase.isSettled) doc.text('Paiement: SOLDÉ', 210 - margin, 87, { align: 'right' });

    // Items Table
    const items = purchase.items || [];
    const tableRows = items.map(item => [
      item.reference || 'N/A',
      item.name || 'N/A',
      (item.quantity || 0).toString(),
      (item.unitPriceHT || 0).toFixed(2),
      '20%',
      ((item.priceTTC || 0) * (item.quantity || 0)).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['RÉFÉRENCE', 'DÉSIGNATION', 'QTÉ', 'P.U. HT', 'TVA', 'TOTAL TTC']],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 150;
    const totalHT = items.reduce((acc, item) => acc + ((item.unitPriceHT || 0) * (item.quantity || 0)), 0);
    const totalTVA = purchase.totalTTC - totalHT;

    const totalsX = 210 - margin;
    doc.setFontSize(10);
    
    doc.text('TOTAL HT:', totalsX - 35, finalY);
    doc.text(`${totalHT.toFixed(2)} DH`, totalsX, finalY, { align: 'right' });
    
    doc.text('TVA (20%):', totalsX - 35, finalY + 7);
    doc.text(`${totalTVA.toFixed(2)} DH`, totalsX, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 50, finalY + 11, totalsX, finalY + 11);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('TOTAL TTC:', totalsX - 35, finalY + 19);
    doc.text(`${purchase.totalTTC.toFixed(2)} DH`, totalsX, finalY + 19, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    const footerText = 'Généré par Lumina BackOffice - Logiciel de gestion ERP';
    doc.text(footerText, 105, 285, { align: 'center' });

    // Save the PDF
    const fileName = `${purchase.type.replace(/\s+/g, '_')}_${purchase.id.slice(0, 8)}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Erreur lors de la génération du PDF. Veuillez vérifier la console.");
  }
};

export const generateSalePDF = (sale: Sale, clients: Client[]) => {
  console.log("Generating Sale PDF for:", sale.id);
  try {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header - User Business
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Brand Accent Emerald
    doc.text('LUMINA ERP - VENTES', margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Muted
    doc.text('123 Avenue des Entreprises', margin, 38);
    doc.text('75001 Paris, France', margin, 43);
    doc.text('contact@lumina.com', margin, 48);

    // Document Title & Info
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42); // Ink
    const title = sale.type.toUpperCase();
    doc.text(title, 210 - margin, 30, { align: 'right' });
    
    doc.setDrawColor(226, 232, 240); // Border
    doc.line(margin, 55, 210 - margin, 55);

    // Client(s) Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT(S):', margin, 65);
    doc.setFont('helvetica', 'normal');
    
    let clientY = 72;
    sale.clientIds.forEach(cid => {
      const c = clients.find(cl => cl.id === cid);
      if (c) {
        doc.text(c.name, margin, clientY);
        clientY += 5;
      }
    });

    // Date & Number
    doc.setFont('helvetica', 'bold');
    doc.text('DÉTAILS DU DOCUMENT:', 210 - margin, 65, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(sale.date), 'dd/MM/yyyy')}`, 210 - margin, 72, { align: 'right' });
    doc.text(`Référence: ${sale.customReference}`, 210 - margin, 77, { align: 'right' });
    if (sale.isValidated) doc.text('Statut: VALIDÉ', 210 - margin, 82, { align: 'right' });
    if (sale.isSettled) doc.text('Paiement: SOLDÉ', 210 - margin, 87, { align: 'right' });

    // Items Table
    const items = sale.items || [];
    const tableRows = items.map(item => [
      item.reference || 'N/A',
      item.name || 'N/A',
      (item.quantity || 0).toString(),
      (item.unitPriceHT || 0).toFixed(2),
      '20%',
      ((item.priceTTC || 0) * (item.quantity || 0)).toFixed(2)
    ]);

    autoTable(doc, {
      startY: 100,
      head: [['RÉFÉRENCE', 'DÉSIGNATION', 'QTÉ', 'P.U. HT', 'TVA', 'TOTAL TTC']],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 150;
    const totalHT = items.reduce((acc, item) => acc + ((item.unitPriceHT || 0) * (item.quantity || 0)), 0);
    const totalTVA = sale.totalTTC - totalHT;

    const totalsX = 210 - margin;
    doc.setFontSize(10);
    
    doc.text('TOTAL HT:', totalsX - 35, finalY);
    doc.text(`${totalHT.toFixed(2)} DH`, totalsX, finalY, { align: 'right' });
    
    doc.text('TVA (20%):', totalsX - 35, finalY + 7);
    doc.text(`${totalTVA.toFixed(2)} DH`, totalsX, finalY + 7, { align: 'right' });
    
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 50, finalY + 11, totalsX, finalY + 11);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('TOTAL TTC:', totalsX - 35, finalY + 19);
    doc.text(`${sale.totalTTC.toFixed(2)} DH`, totalsX, finalY + 19, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    const footerText = 'Généré par Lumina ERP - Module Ventes';
    doc.text(footerText, 105, 285, { align: 'center' });

    // Save the PDF
    const fileName = `${sale.type.replace(/\s+/g, '_')}_${sale.id.slice(0, 8)}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    alert("Erreur lors de la génération du PDF. Veuillez vérifier la console.");
  }
};

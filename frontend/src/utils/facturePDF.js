// src/utils/facturePDF.js
// Génère une facture PDF A4 professionnelle à partir d'une vente
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Couleurs de la marque
const NAVY   = [30, 58, 95];
const ORANGE = [255, 107, 53];
const GRIS   = [120, 120, 120];

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');

// ── Informations de l'entreprise (à adapter avec les vraies valeurs) ──
const ENTREPRISE = {
  nom:     'SunuStock SARL',
  slogan:  'Gestion de Stock & Point de Vente',
  adresse: 'Sacré-Cœur 3, Dakar — Sénégal',
  tel:     '+221 33 800 00 00',
  email:   'contact@sunustock.sn',
  ninea:   '0000000 2A1',
  rc:      'SN-DKR-2026-B-00000',
};

export function genererFacturePDF(vente) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; // largeur A4
  let y = 15;

  // ── En-tête : logo wordmark + infos entreprise ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...NAVY);
  doc.text('Sunu', 14, y);
  const wSunu = doc.getTextWidth('Sunu');
  doc.setTextColor(...ORANGE);
  doc.text('Stock', 14 + wSunu, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(ENTREPRISE.slogan, 14, y + 5);
  doc.text(ENTREPRISE.adresse, 14, y + 9);
  doc.text(`Tél : ${ENTREPRISE.tel}`, 14, y + 13);
  doc.text(`Email : ${ENTREPRISE.email}`, 14, y + 17);

  // ── Bloc FACTURE (à droite) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text('FACTURE', W - 14, y, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const dateStr = (vente.date ? new Date(vente.date) : new Date())
    .toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`N° ${vente.numero || '—'}`, W - 14, y + 6, { align: 'right' });
  doc.text(`Date : ${dateStr}`, W - 14, y + 11, { align: 'right' });
  doc.text(`Caissier : ${vente.caissier || '—'}`, W - 14, y + 16, { align: 'right' });

  // Ligne de séparation
  y += 24;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(14, y, W - 14, y);
  y += 8;

  // ── Bloc client ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('Facturé à :', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  if (vente.client) {
    doc.text(vente.client.nom, 14, y + 5);
    if (vente.client.statut) {
      doc.text(`Client ${vente.client.statut.toUpperCase()}`, 14, y + 10);
    }
  } else {
    doc.text('Client comptoir', 14, y + 5);
  }
  y += 16;

  // ── Tableau des articles ──
  const corps = (vente.lignes || []).map((l) => [
    l.nom,
    String(l.quantite),
    `${fmt(l.prix_vente)} F`,
    `${fmt(l.prix_vente * l.quantite)} F`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Désignation', 'Qté', 'P.U. HT', 'Montant HT']],
    body: corps,
    theme: 'striped',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: 50 },
    columnStyles: {
      0: { cellWidth: 92 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Bloc totaux (sous le tableau, à droite) ──
  let yt = doc.lastAutoTable.finalY + 8;
  const xLabel = W - 80;
  const xValue = W - 14;

  const ligneTotal = (label, valeur, gras = false, couleur = [60, 60, 60]) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal');
    doc.setFontSize(gras ? 11 : 9);
    doc.setTextColor(...couleur);
    doc.text(label, xLabel, yt);
    doc.text(`${fmt(valeur)} FCFA`, xValue, yt, { align: 'right' });
    yt += gras ? 8 : 6;
  };

  const htBrut = vente.totalHTBrut ?? vente.totalHT;
  ligneTotal('Total HT', htBrut);
  if (vente.remiseClient > 0) {
    ligneTotal(`Remise fidélité (-${vente.tauxRemise}%)`, -vente.remiseClient, false, ORANGE);
  }
  ligneTotal('TVA (18%)', vente.totalTVA);

  // Trait avant le total TTC
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(xLabel, yt - 2, xValue, yt - 2);
  yt += 2;
  ligneTotal('NET À PAYER TTC', vente.totalTTC, true, NAVY);

  // ── Paiement ──
  yt += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const modeLabel = {
    especes: 'Espèces', carte: 'Carte bancaire', mobile_money: 'Mobile Money',
  }[vente.modePaiement] || vente.modePaiement;
  doc.text(`Mode de règlement : ${modeLabel}`, 14, yt);
  if (vente.modePaiement === 'especes') {
    doc.text(`Montant reçu : ${fmt(vente.montantRecu)} FCFA`, 14, yt + 5);
    doc.text(`Monnaie rendue : ${fmt(vente.monnaie)} FCFA`, 14, yt + 10);
  }

  // ── Mentions légales (bas de page) ──
  const yLegal = 270;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, yLegal - 4, W - 14, yLegal - 4);
  doc.setFontSize(7);
  doc.setTextColor(...GRIS);
  doc.text(`NINEA : ${ENTREPRISE.ninea}   |   RC : ${ENTREPRISE.rc}   |   TVA 18% incluse`, W / 2, yLegal, { align: 'center' });
  doc.text('Facture payable à réception. Aucun escompte pour règlement anticipé.', W / 2, yLegal + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('Merci de votre confiance — SunuStock', W / 2, yLegal + 10, { align: 'center' });

  // ── Téléchargement ──
  doc.save(`Facture_${vente.numero || 'sunustock'}.pdf`);
}

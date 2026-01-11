import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesReport } from '../types';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function exportReportToExcel(report: SalesReport, startDate: string, endDate: string): void {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Sotuvlar Hisoboti'],
    [`Davr: ${formatDate(startDate)} - ${formatDate(endDate)}`],
    [],
    ['Umumiy ko\'rsatkichlar'],
    ['Jami daromad', formatCurrency(report.totalRevenue)],
    ['Jami foyda', formatCurrency(report.totalProfit)],
    ['Sotuvlar soni', report.completedSalesCount],
    ['Bekor qilingan', report.cancelledSalesCount],
    ['O\'rtacha sotuv', formatCurrency(report.averageSaleAmount)],
    [],
    ['To\'lov usullari'],
    ['Naqd', formatCurrency(report.cashTotal)],
    ['Karta', formatCurrency(report.cardTotal)],
    ['O\'tkazma', formatCurrency(report.transferTotal)],
    ['Qarz', formatCurrency(report.debtTotal)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Umumiy');

  // Daily sales sheet
  const dailyHeaders = ['Sana', 'Sotuvlar soni', 'Daromad'];
  const dailyRows = report.dailyData.map(day => [
    formatDate(day.date),
    day.salesCount,
    formatCurrency(day.revenue),
  ]);
  const dailySheet = XLSX.utils.aoa_to_sheet([dailyHeaders, ...dailyRows]);
  dailySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Kunlik sotuvlar');

  // Top products sheet
  const productHeaders = ['#', 'Mahsulot', 'SKU', 'Sotilgan', 'Daromad'];
  const productRows = report.topProducts.map((product, index) => [
    index + 1,
    product.productName,
    product.productSku,
    product.quantitySold,
    formatCurrency(product.totalRevenue),
  ]);
  const productSheet = XLSX.utils.aoa_to_sheet([productHeaders, ...productRows]);
  productSheet['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, productSheet, 'Top mahsulotlar');

  // Top customers sheet
  const customerHeaders = ['#', 'Mijoz', 'Telefon', 'Xaridlar soni', 'Jami sarflagan'];
  const customerRows = report.topCustomers.map((customer, index) => [
    index + 1,
    customer.customerName,
    customer.customerPhone,
    customer.purchaseCount,
    formatCurrency(customer.totalSpent),
  ]);
  const customerSheet = XLSX.utils.aoa_to_sheet([customerHeaders, ...customerRows]);
  customerSheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Top mijozlar');

  // Download
  const filename = `hisobot_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportReportToPDF(report: SalesReport, startDate: string, endDate: string): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Sotuvlar Hisoboti', 105, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.text(`Davr: ${formatDate(startDate)} - ${formatDate(endDate)}`, 105, yPos, { align: 'center' });
  yPos += 15;

  // Summary section
  doc.setFontSize(14);
  doc.text('Umumiy ko\'rsatkichlar', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Ko\'rsatkich', 'Qiymat']],
    body: [
      ['Jami daromad', formatCurrency(report.totalRevenue)],
      ['Jami foyda', formatCurrency(report.totalProfit)],
      ['Sotuvlar soni', report.completedSalesCount.toString()],
      ['Bekor qilingan', report.cancelledSalesCount.toString()],
      ['O\'rtacha sotuv', formatCurrency(report.averageSaleAmount)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14 },
    tableWidth: 90,
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Payment methods
  autoTable(doc, {
    startY: yPos,
    head: [['To\'lov usuli', 'Summa']],
    body: [
      ['Naqd', formatCurrency(report.cashTotal)],
      ['Karta', formatCurrency(report.cardTotal)],
      ['O\'tkazma', formatCurrency(report.transferTotal)],
      ['Qarz', formatCurrency(report.debtTotal)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    margin: { left: 110 },
    tableWidth: 85,
  });

  // New page for top products
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.text('Top 10 mahsulotlar', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Mahsulot', 'SKU', 'Sotilgan', 'Daromad']],
    body: report.topProducts.map((product, index) => [
      (index + 1).toString(),
      product.productName,
      product.productSku,
      product.quantitySold.toString(),
      formatCurrency(product.totalRevenue),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Top customers
  doc.setFontSize(14);
  doc.text('Top 10 mijozlar', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Mijoz', 'Telefon', 'Xaridlar', 'Jami']],
    body: report.topCustomers.map((customer, index) => [
      (index + 1).toString(),
      customer.customerName,
      customer.customerPhone,
      customer.purchaseCount.toString(),
      formatCurrency(customer.totalSpent),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
  });

  // New page for daily data
  if (report.dailyData.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.text('Kunlik sotuvlar', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Sana', 'Sotuvlar soni', 'Daromad']],
      body: report.dailyData.map(day => [
        formatDate(day.date),
        day.salesCount.toString(),
        formatCurrency(day.revenue),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
    });
  }

  // Download
  const filename = `hisobot_${startDate}_${endDate}.pdf`;
  doc.save(filename);
}

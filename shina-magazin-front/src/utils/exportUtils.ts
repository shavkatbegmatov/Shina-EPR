import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SalesReport, WarehouseReport } from '../types';

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
  const filename = `sotuvlar_hisoboti_${startDate}_${endDate}.pdf`;
  doc.save(filename);
}

// Warehouse Report Export Functions
export function exportWarehouseReportToExcel(report: WarehouseReport, startDate: string, endDate: string): void {
  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Ombor Hisoboti'],
    [`Davr: ${formatDate(startDate)} - ${formatDate(endDate)}`],
    [],
    ['Umumiy ko\'rsatkichlar'],
    ['Jami mahsulotlar', report.totalProducts],
    ['Ombordagi jami', `${report.totalStock} dona`],
    ['Ombor qiymati', formatCurrency(report.totalStockValue)],
    ['Potensial daromad', formatCurrency(report.totalPotentialRevenue)],
    [],
    ['Zaxira holati'],
    ['Kam qolgan', report.lowStockCount],
    ['Tugagan', report.outOfStockCount],
    [],
    ['Harakatlar'],
    ['Kirim harakatlari', report.inMovementsCount],
    ['Chiqim harakatlari', report.outMovementsCount],
    ['Jami kirim', `${report.totalIncoming} dona`],
    ['Jami chiqim', `${report.totalOutgoing} dona`],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Umumiy');

  // Stock by category
  const categoryHeaders = ['Kategoriya', 'Mahsulotlar', 'Omborda', 'Qiymati'];
  const categoryRows = report.stockByCategory.map(cat => [
    cat.categoryName,
    cat.productCount,
    `${cat.totalStock} dona`,
    formatCurrency(cat.stockValue),
  ]);
  const categorySheet = XLSX.utils.aoa_to_sheet([categoryHeaders, ...categoryRows]);
  categorySheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, categorySheet, 'Kategoriyalar');

  // Stock by brand
  const brandHeaders = ['Brend', 'Mahsulotlar', 'Omborda', 'Qiymati'];
  const brandRows = report.stockByBrand.map(brand => [
    brand.brandName,
    brand.productCount,
    `${brand.totalStock} dona`,
    formatCurrency(brand.stockValue),
  ]);
  const brandSheet = XLSX.utils.aoa_to_sheet([brandHeaders, ...brandRows]);
  brandSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, brandSheet, 'Brendlar');

  // Low stock products
  const lowStockHeaders = ['Mahsulot', 'SKU', 'Hozirgi', 'Minimal', 'Narxi'];
  const lowStockRows = report.lowStockProducts.map(product => [
    product.productName,
    product.productSku,
    product.currentStock,
    product.minStockLevel,
    formatCurrency(product.sellingPrice),
  ]);
  const lowStockSheet = XLSX.utils.aoa_to_sheet([lowStockHeaders, ...lowStockRows]);
  lowStockSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Kam qolgan');

  // Daily movements
  const movementHeaders = ['Sana', 'Kirim soni', 'Kirim miqdori', 'Chiqim soni', 'Chiqim miqdori'];
  const movementRows = report.recentMovements.map(mov => [
    formatDate(mov.date),
    mov.inCount,
    `${mov.inQuantity} dona`,
    mov.outCount,
    `${mov.outQuantity} dona`,
  ]);
  const movementSheet = XLSX.utils.aoa_to_sheet([movementHeaders, ...movementRows]);
  movementSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, movementSheet, 'Harakatlar');

  // Download
  const filename = `ombor_hisoboti_${startDate}_${endDate}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

export function exportWarehouseReportToPDF(report: WarehouseReport, startDate: string, endDate: string): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Title
  doc.setFontSize(18);
  doc.text('Ombor Hisoboti', 105, yPos, { align: 'center' });
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
      ['Jami mahsulotlar', report.totalProducts.toString()],
      ['Ombordagi jami', `${report.totalStock} dona`],
      ['Ombor qiymati', formatCurrency(report.totalStockValue)],
      ['Potensial daromad', formatCurrency(report.totalPotentialRevenue)],
      ['Kam qolgan', report.lowStockCount.toString()],
      ['Tugagan', report.outOfStockCount.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14 },
    tableWidth: 90,
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Movements summary
  autoTable(doc, {
    startY: yPos,
    head: [['Harakat turi', 'Qiymat']],
    body: [
      ['Kirim harakatlari', report.inMovementsCount.toString()],
      ['Chiqim harakatlari', report.outMovementsCount.toString()],
      ['Jami kirim', `${report.totalIncoming} dona`],
      ['Jami chiqim', `${report.totalOutgoing} dona`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    margin: { left: 110 },
    tableWidth: 85,
  });

  // Categories page
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.text('Kategoriya bo\'yicha', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Kategoriya', 'Mahsulotlar', 'Omborda', 'Qiymati']],
    body: report.stockByCategory.map(cat => [
      cat.categoryName,
      cat.productCount.toString(),
      `${cat.totalStock} dona`,
      formatCurrency(cat.stockValue),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Brands
  doc.setFontSize(14);
  doc.text('Brend bo\'yicha', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Brend', 'Mahsulotlar', 'Omborda', 'Qiymati']],
    body: report.stockByBrand.map(brand => [
      brand.brandName,
      brand.productCount.toString(),
      `${brand.totalStock} dona`,
      formatCurrency(brand.stockValue),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
  });

  // Low stock products page
  if (report.lowStockProducts.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.text('Kam qolgan mahsulotlar', 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [['Mahsulot', 'SKU', 'Hozirgi', 'Minimal', 'Narxi']],
      body: report.lowStockProducts.map(product => [
        product.productName,
        product.productSku,
        product.currentStock.toString(),
        product.minStockLevel.toString(),
        formatCurrency(product.sellingPrice),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
  }

  // Download
  const filename = `ombor_hisoboti_${startDate}_${endDate}.pdf`;
  doc.save(filename);
}

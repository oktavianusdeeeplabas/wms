import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: Record<string, string | number>[];
}

// === PDF Export ===
export function exportToPDF(report: ReportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(report.title, 14, 18);

  if (report.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(report.subtitle, 14, 25);
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated: ${report.generatedAt}`, 14, 31);

  // Table
  const headers = report.columns.map((c) => c.header);
  const body = report.rows.map((row) =>
    report.columns.map((c) => {
      const val = row[c.key];
      return val !== null && val !== undefined ? String(val) : '-';
    })
  );

  autoTable(doc, {
    head: [headers],
    body,
    startY: 35,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  });

  // Summary section
  if (report.summary && report.summary.length > 0) {
    const finalY = (doc as unknown as Record<string, number>).lastAutoTable?.finalY || 200;
    let yPos = finalY + 10;

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Summary', 14, yPos);
    yPos += 6;

    doc.setFontSize(8);
    report.summary.forEach((item) => {
      const entries = Object.entries(item);
      const text = entries.map(([k, v]) => `${k}: ${v}`).join('  |  ');
      doc.setTextColor(71, 85, 105);
      doc.text(text, 14, yPos);
      yPos += 5;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Cloud Kitchen WMS - ${report.title} - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`${report.title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

// === Excel Export ===
export function exportToExcel(report: ReportData) {
  const wb = XLSX.utils.book_new();

  // Main data sheet
  const wsData = [
    [report.title],
    [report.subtitle || ''],
    [`Generated: ${report.generatedAt}`],
    [],
    report.columns.map((c) => c.header),
    ...report.rows.map((row) =>
      report.columns.map((c) => {
        const val = row[c.key];
        return val !== null && val !== undefined ? val : '';
      })
    ),
  ];

  // Add summary if present
  if (report.summary && report.summary.length > 0) {
    wsData.push([]);
    wsData.push(['Summary']);
    report.summary.forEach((item) => {
      const entries = Object.entries(item);
      wsData.push(entries.map(([k, v]) => `${k}: ${v}`));
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = report.columns.map((c) => ({ wch: c.width || 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${report.title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
}

// === CSV Export ===
export function exportToCSV(report: ReportData) {
  const data = report.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    report.columns.forEach((c) => {
      obj[c.header] = row[c.key] !== null && row[c.key] !== undefined ? row[c.key] : '';
    });
    return obj;
  });

  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${report.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
}
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { jsPDF as JsPdfDocument } from 'jspdf';
import type { RowInput } from 'jspdf-autotable';
import { PreferencesService } from '../../profile/services/preferences.service';
import { toIsoDate } from '../../shared/utils/date.utils';
import { WeeklyReport } from '../model/weekly-report.model';

type RgbColor = [number, number, number];

const JET: RgbColor = [47, 46, 45];
const SINOPIA: RgbColor = [196, 53, 8];
const SELECTIVE_YELLOW: RgbColor = [255, 182, 39];
const MUTED: RgbColor = [116, 111, 106];
const HEADER_FILL: RgbColor = [251, 248, 245];
const MARGIN = 14;

/**
 * Generates the downloadable weekly report in PDF, a portable format (HU52).
 * jsPDF is loaded on demand so it does not weigh on the initial bundle.
 */
@Injectable({ providedIn: 'root' })
export class ReportPdfService {
  private readonly translate = inject(TranslateService);
  private readonly preferences = inject(PreferencesService);

  async download(report: WeeklyReport): Promise<string> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const t = (key: string, params?: Record<string, unknown>): string => this.translate.instant(key, params);
    const date = (value: string | Date): string => this.formatDate(value);
    const number = (value: number): string =>
      new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value);
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header band with the brand colours.
    doc.setFillColor(...JET);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setFillColor(...SELECTIVE_YELLOW);
    doc.rect(0, 30, pageWidth, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('ARQUITECH', MARGIN, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(t('reports.pdf.subtitle'), MARGIN, 21);
    doc.text(
      t('reports.weekRange', { start: date(report.weekStart), end: date(report.weekEnd) }),
      pageWidth - MARGIN,
      21,
      { align: 'right' },
    );

    doc.setTextColor(...JET);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(report.project.name, MARGIN, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(t('reports.pdf.generatedAt', { date: date(report.generatedAt) }), MARGIN, 50);

    const tableTheme = {
      theme: 'grid' as const,
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: JET,
        lineColor: [229, 222, 215] as RgbColor,
        cellPadding: 2.5,
      },
      headStyles: { fillColor: HEADER_FILL, textColor: MUTED, fontStyle: 'bold' as const },
    };

    let cursor = 56;
    const section = (title: string): void => {
      if (cursor > 260) {
        doc.addPage();
        cursor = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...SINOPIA);
      doc.text(title, MARGIN, cursor);
      cursor += 3;
    };
    const table = (head: string[], body: RowInput[]): void => {
      // HU20 AC2: a category without records is still part of the report.
      const emptyRow: RowInput = [
        { content: t('reports.emptySection'), colSpan: head.length, styles: { textColor: MUTED, fontStyle: 'italic' } },
      ];
      autoTable(doc, {
        ...tableTheme,
        startY: cursor,
        head: [head],
        body: body.length > 0 ? body : [emptyRow],
      });
      cursor = this.lastTableY(doc) + 10;
    };

    section(t('reports.sections.project'));
    table(
      [t('reports.pdf.field'), t('reports.pdf.value')],
      [
        [t('projects.fields.location'), report.project.location],
        [t('common.status'), t(`projects.status.${report.project.status}`)],
        [t('projects.fields.progress'), `${report.project.progress}%`],
        [t('projects.fields.startDate'), date(report.project.startDate)],
        [t('projects.fields.endDate'), date(report.project.endDate)],
        [t('reports.kpis.openTasks'), String(report.openTasks)],
        [t('reports.kpis.openIncidents'), String(report.openIncidents)],
      ],
    );

    section(`${t('reports.sections.completedTasks')} (${report.completedTasks.length})`);
    table(
      [t('tasks.columns.task'), t('tasks.columns.worker'), t('reports.columns.completedOn')],
      report.completedTasks.map((entry) => [entry.task.title, entry.workerName || '-', date(entry.completedOn)]),
    );

    section(`${t('reports.sections.entries')} (${report.entries.length})`);
    table(
      [
        t('movements.columns.date'),
        t('movements.columns.material'),
        t('movements.columns.quantity'),
        t('movements.columns.supplier'),
      ],
      report.entries.map((movement) => [
        date(movement.occurredAt),
        movement.materialName,
        `${number(movement.quantity)} ${movement.unit}`,
        movement.supplier || '-',
      ]),
    );

    section(`${t('reports.sections.usages')} (${report.usages.length})`);
    table(
      [
        t('movements.columns.date'),
        t('movements.columns.material'),
        t('movements.columns.quantity'),
        t('movements.fields.note'),
      ],
      report.usages.map((movement) => [
        date(movement.occurredAt),
        movement.materialName,
        `${number(movement.quantity)} ${movement.unit}`,
        movement.note || '-',
      ]),
    );

    section(`${t('reports.sections.incidents')} (${report.incidents.length})`);
    table(
      [t('incidents.columns.date'), t('incidents.columns.type'), t('incidents.columns.severity'), t('common.status')],
      report.incidents.map((incident) => [
        date(incident.reportedAt),
        incident.typeKey ? t(incident.typeKey) : incident.type,
        t(`incidents.severity.${incident.severity}`),
        t(`incidents.status.${incident.status}`),
      ]),
    );

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(t('reports.pdf.footer', { page, pages }), pageWidth / 2, 290, { align: 'center' });
    }

    const fileName = `arquitech-reporte-semanal-${this.slug(report.project.name)}-${toIsoDate(report.weekStart)}.pdf`;
    doc.save(fileName);
    return fileName;
  }

  private lastTableY(doc: JsPdfDocument): number {
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  private formatDate(value: string | Date): string {
    const parsed = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T12:00:00` : value);
    return new Intl.DateTimeFormat(this.preferences.locale, { day: '2-digit', month: 'short', year: 'numeric' })
      .format(parsed)
      .replace(/\./g, '');
  }

  private slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

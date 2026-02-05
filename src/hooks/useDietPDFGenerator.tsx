import { useState } from 'react';
import type { DietPDFGeneratorProps } from '@/components/DietPDFTypes';
import { shareOrDownloadFile, blobToFile, type ShareOrCopyResult } from '@/utils/shareUtils';

/**
 * Lazy-loaded PDF generator hook
 *
 * This hook dynamically imports @react-pdf/renderer and DietPDFGenerator
 * only when generatePDF or downloadPDF is called. This reduces initial
 * bundle size by ~700-1000KB.
 *
 * Benefits:
 * - Initial bundle: ~700-1000KB smaller
 * - @react-pdf/renderer loaded only on-demand
 * - Better performance for users who don't generate PDFs
 * - iOS Safari support via Web Share API
 *
 * @returns {Object} - { generatePDF, downloadPDF, isLoading }
 */
export const useDietPDFGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Generate PDF Blob (lazy loads @react-pdf/renderer)
   * @param props - PDF generation props (without header/footer dimensions)
   * @returns Promise<Blob> - PDF blob for download or further processing
   */
  const generatePDF = async (props: DietPDFGeneratorProps): Promise<Blob> => {
    setIsLoading(true);
    try {
      // LAZY LOAD: @react-pdf/renderer (~500-700KB)
      const { pdf } = await import('@react-pdf/renderer');

      // LAZY LOAD: DietPDFGenerator components and utils
      const {
        DietPDFDocument,
        A4_WIDTH_PT,
        mm,
        headerImage,
        footerImage
      } = await import('@/components/DietPDFGenerator');

      // LAZY LOAD: getImageSize utility
      const { getImageSize } = await import('@/utils/getImageSize');

      // Measure header/footer images to calculate heights
      const [hdr, ftr] = await Promise.all([
        getImageSize(headerImage),
        getImageSize(footerImage)
      ]);

      // Calculate header/footer heights (scaled to full page width with limits)
      const maxHeaderHeightPt = mm(40); // max 40 mm
      const maxFooterHeightPt = mm(30); // max 30 mm
      const headerHeightPt = Math.min(A4_WIDTH_PT * (hdr.h / hdr.w), maxHeaderHeightPt);
      const footerHeightPt = Math.min(A4_WIDTH_PT * (ftr.h / ftr.w), maxFooterHeightPt);

      // Create PDF document with all props
      const doc = (
        <DietPDFDocument
          {...props}
          headerHeightPt={headerHeightPt}
          footerHeightPt={footerHeightPt}
          headerUrl={headerImage}
          footerUrl={footerImage}
        />
      );

      // Generate and return PDF blob
      return await pdf(doc).toBlob();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Download PDF file (lazy loads @react-pdf/renderer)
   * Uses Web Share API on iOS Safari, standard download on other browsers
   *
   * @param props - PDF generation props (without header/footer dimensions)
   * @param filename - Optional custom filename (defaults to auto-generated)
   * @returns Promise<ShareOrCopyResult> - result with status and message for toast
   */
  const downloadPDF = async (
    props: DietPDFGeneratorProps,
    filename?: string
  ): Promise<ShareOrCopyResult> => {
    try {
      // Generate PDF blob (lazy loads dependencies)
      const blob = await generatePDF(props);

      // Generate filename from client name or use provided filename
      const safeName = `${props.client.imie || 'Client'}_${props.client.nazwisko || ''}`.replace(/[^\w-]/g, '_');
      const pdfFilename = filename || `Jadlospis_${safeName}_${new Date().toLocaleDateString('pl-PL').replace(/\./g, '-')}.pdf`;

      // Convert blob to File for Web Share API compatibility
      const file = blobToFile(blob, pdfFilename);

      // Use shareOrDownloadFile - iOS uses Web Share API, desktop uses standard download
      return await shareOrDownloadFile(file, pdfFilename);
    } catch (error) {
      return {
        result: 'error',
        message: 'Błąd generowania PDF. Spróbuj ponownie.',
      };
    }
  };

  return {
    generatePDF,
    downloadPDF,
    isLoading
  };
};

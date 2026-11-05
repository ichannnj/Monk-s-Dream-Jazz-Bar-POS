import { Platform } from 'react-native';

export interface PrintOptions {
  title?: string;
  isThermal?: boolean;
  pageSize?: 'A4' | '80mm';
  customStyles?: string;
}

/**
 * Universal browser print helper for Monk's Dream Jazz Bar POS.
 *
 * Injects dedicated, temporary print styling into the main document to ensure:
 * - Only the designated report or thermal slip is visible during print
 * - React Native Web body/root overflow:hidden constraints are lifted during @media print
 * - All NativeWind/Tailwind styles, fonts, and colors are 100% preserved
 * - No blank/white page bugs caused by cross-iframe CSS or hidden rendering
 * - Page margins and dimensions adhere strictly to A4 or 80mm roll format
 */
export function printHtmlElement(elementId: string, options?: PrintOptions): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const targetEl = document.getElementById(elementId);
  if (!targetEl) {
    console.warn(`[printHtmlElement] Target element with ID "${elementId}" not found in DOM.`);
    return false;
  }

  const isThermal = Boolean(options?.isThermal || options?.pageSize === '80mm');
  const styleTagId = 'monks-pos-active-print-stylesheet';

  // Mark all ancestors of targetEl so they don't hide or clip the target in print
  const printTargetClass = 'monks-active-print-target';
  const printAncestorClass = 'monks-active-print-ancestor';

  // Remove existing markers if any
  document.querySelectorAll(`.${printTargetClass}, .${printAncestorClass}`).forEach((el) => {
    el.classList.remove(printTargetClass, printAncestorClass);
  });

  targetEl.classList.add(printTargetClass);
  let parent = targetEl.parentElement;
  while (parent && parent !== document.body) {
    parent.classList.add(printAncestorClass);
    parent = parent.parentElement;
  }

  // Remove any stale print stylesheet
  const existing = document.getElementById(styleTagId);
  if (existing) {
    existing.remove();
  }

  const styleEl = document.createElement('style');
  styleEl.id = styleTagId;

  const pageSize = isThermal ? '80mm auto' : 'A4 portrait';
  const pageMargin = isThermal ? '2mm' : '6mm 8mm';
  const targetWidth = isThermal ? '76mm' : '100%';

  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${pageSize};
        margin: ${pageMargin};
      }

      /* Reset root containers to avoid React Native Web viewport clipping */
      html, body, #root, #__next, [data-reactroot], [data-radix-portal] {
        overflow: visible !important;
        height: auto !important;
        min-height: 100% !important;
        background: #ffffff !important;
        color: #111827 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Hide everything by default */
      body * {
        visibility: hidden !important;
      }

      /* Ancestors must be visible and cannot clip, transform, or have backgrounds */
      .${printAncestorClass} {
        visibility: visible !important;
        overflow: visible !important;
        position: static !important;
        transform: none !important;
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        height: auto !important;
        max-height: none !important;
      }

      /* Print target and all its contents are 100% visible */
      .${printTargetClass}, .${printTargetClass} * {
        visibility: visible !important;
      }

      .${printTargetClass} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: ${targetWidth} !important;
        max-width: ${targetWidth} !important;
        margin: 0 auto !important;
        padding: ${isThermal ? '2px' : '0px'} !important;
        background: #ffffff !important;
        box-shadow: none !important;
        border: none !important;
        z-index: 2147483647 !important;
        ${!isThermal ? 'zoom: 0.82; -moz-transform: scale(0.82); -moz-transform-origin: top center;' : ''}
      }

      /* Compact font scale for executive 1-page reports */
      ${
        !isThermal
          ? `
      .${printTargetClass} .text-3xl {
        font-size: 1.35rem !important;
        line-height: 1.75rem !important;
      }
      .${printTargetClass} .text-2xl {
        font-size: 1.15rem !important;
        line-height: 1.5rem !important;
      }
      .${printTargetClass} .text-xl {
        font-size: 1rem !important;
        line-height: 1.35rem !important;
      }
      .${printTargetClass} .text-lg {
        font-size: 0.95rem !important;
        line-height: 1.25rem !important;
      }
      .${printTargetClass} .text-base {
        font-size: 0.82rem !important;
        line-height: 1.15rem !important;
      }
      .${printTargetClass} .text-sm {
        font-size: 0.75rem !important;
        line-height: 1rem !important;
      }
      `
          : ''
      }

      /* Tighten spacing for single page fitting */
      .${printTargetClass} .p-4,
      .${printTargetClass} .p-5, 
      .${printTargetClass} .p-6, 
      .${printTargetClass} .p-7, 
      .${printTargetClass} .p-8 {
        padding: 6px 10px !important;
      }

      .${printTargetClass} .mb-6,
      .${printTargetClass} .mb-5,
      .${printTargetClass} .mb-4 {
        margin-bottom: 6px !important;
      }

      .${printTargetClass} .mt-6,
      .${printTargetClass} .mt-8,
      .${printTargetClass} .mt-5,
      .${printTargetClass} .mt-4 {
        margin-top: 6px !important;
      }

      .${printTargetClass} .gap-6,
      .${printTargetClass} .gap-5,
      .${printTargetClass} .gap-4 {
        gap: 6px !important;
      }

      /* Explicit display rules for print classes */
      .print-only {
        display: block !important;
      }

      .print-hidden,
      .no-print {
        display: none !important;
      }

      .print-avoid-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Grid helpers for printing */
      .report-grid-2col {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
      }

      .report-grid-3col {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 10px !important;
      }

      .report-grid-4col {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 8px !important;
      }

      /* Print color fidelity */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      ${options?.customStyles || ''}
    }
  `;

  document.head.appendChild(styleEl);

  // Set original title temporarily if custom title provided
  const originalTitle = document.title;
  if (options?.title) {
    document.title = options.title;
  }

  // Trigger print dialog
  window.print();

  // Restore document title and cleanup stylesheet & classes
  if (options?.title) {
    document.title = originalTitle;
  }

  // Keep stylesheet active briefly for the browser spooler, then clean up
  setTimeout(() => {
    document.querySelectorAll(`.${printTargetClass}, .${printAncestorClass}`).forEach((el) => {
      el.classList.remove(printTargetClass, printAncestorClass);
    });
    const active = document.getElementById(styleTagId);
    if (active) {
      active.remove();
    }
  }, 1000);

  return true;
}

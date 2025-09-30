export function exportNoteToPDF(title: string, content: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1f2937; }
          .content { font-size: 14px; line-height: 1.6; color: #374151; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="content">${content}</div>
        <script>window.print(); window.onafterprint = function() { window.close(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function shareViaEmail(title: string, content: string): void {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  const subject = encodeURIComponent(`Note: ${title}`);
  const body = encodeURIComponent(`${title}\n\n${plainText}`);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
}

export function shareViaWhatsApp(title: string, content: string): void {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  const message = encodeURIComponent(`*${title}*\n\n${plainText}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

export function shareViaWhatsAppPDF(title: string, content: string): void {
  // Open print dialog
  exportNoteToPDF(title, content);
  
  // Guide user with instructions
  alert('After saving as PDF:\n1. Save the PDF to your device\n2. Open WhatsApp\n3. Attach the PDF file\n\nThe print dialog is opening now...');
}

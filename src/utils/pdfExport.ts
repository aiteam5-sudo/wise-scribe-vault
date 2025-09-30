import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportNoteToPDF = async (title: string, content: string): Promise<Blob> => {
  // Create a temporary div to render the content
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '800px';
  tempDiv.style.padding = '40px';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.color = 'black';
  tempDiv.innerHTML = `
    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #1f2937;">${title}</h1>
    <div style="font-size: 14px; line-height: 1.6; color: #374151;">${content}</div>
  `;
  document.body.appendChild(tempDiv);

  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

    // Return as blob
    return pdf.output('blob');
  } finally {
    // Clean up
    document.body.removeChild(tempDiv);
  }
};

export const shareViaEmail = (title: string, pdfBlob: Blob) => {
  // Create a download link for the PDF
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title}.pdf`;
  link.click();
  URL.revokeObjectURL(url);

  // Open email client with pre-filled subject
  const subject = encodeURIComponent(`Note: ${title}`);
  const body = encodeURIComponent(`Please find attached the note: ${title}\n\nNote: Attach the downloaded PDF file to this email.`);
  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
};

export const shareViaWhatsApp = (title: string, content: string) => {
  // Strip HTML tags for WhatsApp
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Limit content length for WhatsApp
  const maxLength = 1000;
  const truncatedContent = plainText.length > maxLength 
    ? plainText.substring(0, maxLength) + '...' 
    : plainText;
  
  const message = encodeURIComponent(`*${title}*\n\n${truncatedContent}`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
};

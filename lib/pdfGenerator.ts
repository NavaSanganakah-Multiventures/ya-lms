import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// Adhyatm & Modern Design Colors
const SAFFRON = rgb(1.0, 0.6, 0.2); // #ff9933
const DARK_RED = rgb(0.5, 0.0, 0.0); // #800000
const GOLD = rgb(0.85, 0.65, 0.13); // #daa520
const DARK_GRAY = rgb(0.2, 0.2, 0.2);

export async function generateCertificatePDF(certData: any): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Load standard fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Fetch Devanagari Font with multiple fallback URLs
  let devanagariFont;
  const fontUrls = [
    '/fonts/NotoSansDevanagari-Regular.ttf',
    '/fonts/NotoSansDevanagari.ttf',
    'https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGjUVpzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6w.ttf',
  ];
  for (const fontUrl of fontUrls) {
    try {
      const fontRes = await fetch(fontUrl);
      if (!fontRes.ok) continue;
      const fontBytes = await fontRes.arrayBuffer();
      devanagariFont = await pdfDoc.embedFont(fontBytes);
      break;
    } catch(e) {
      continue;
    }
  }
  if (!devanagariFont) {
    console.error("Failed to load Devanagari font from all URLs");
    devanagariFont = timesRomanFont; // fallback — Hindi chars will not render
  }

  // A4 Landscape: 842 x 595
  const page = pdfDoc.addPage([842, 595]);
  const { width, height } = page.getSize();

  // Draw borders
  page.drawRectangle({
    x: 20, y: 20, width: width - 40, height: height - 40,
    borderColor: SAFFRON, borderWidth: 4,
  });
  page.drawRectangle({
    x: 30, y: 30, width: width - 60, height: height - 60,
    borderColor: GOLD, borderWidth: 1,
  });

  // Certificate Header
  page.drawText('प्रमाणपत्र (CERTIFICATE OF COMPLETION)', {
    x: 180, y: 480, size: 28, font: devanagariFont, color: DARK_RED,
  });

  page.drawText('This is to certify that', {
    x: 340, y: 400, size: 16, font: timesRomanItalicFont, color: DARK_GRAY,
  });

  // Student Name
  const studentName = certData.full_name || 'Student';
  const studentNameWidth = timesRomanBoldFont.widthOfTextAtSize(studentName, 32);
  page.drawText(studentName, {
    x: (width - studentNameWidth) / 2, y: 350, size: 32, font: timesRomanBoldFont, color: SAFFRON,
  });

  page.drawText('has successfully completed the course', {
    x: 310, y: 300, size: 16, font: timesRomanItalicFont, color: DARK_GRAY,
  });

  // Course Name
  const courseTitle = certData.course_title || 'Unknown Course';
  const courseTitleWidth = devanagariFont.widthOfTextAtSize(courseTitle, 24);
  page.drawText(courseTitle, {
    x: (width - courseTitleWidth) / 2, y: 250, size: 24, font: devanagariFont, color: DARK_RED,
  });

  // Dates and ID
  const dateStr = new Date(certData.issued_at).toLocaleDateString('en-IN');
  page.drawText(`Date: ${dateStr}`, {
    x: 100, y: 120, size: 14, font: timesRomanFont, color: DARK_GRAY,
  });

  page.drawText(`Certificate ID: ${certData.id}`, {
    x: width - 250, y: 120, size: 14, font: timesRomanFont, color: DARK_GRAY,
  });

  page.drawLine({
    start: { x: 80, y: 110 }, end: { x: 220, y: 110 }, thickness: 1, color: DARK_GRAY
  });
  page.drawLine({
    start: { x: width - 270, y: 110 }, end: { x: width - 80, y: 110 }, thickness: 1, color: DARK_GRAY
  });

  page.drawText('Date of Issue', {
    x: 120, y: 90, size: 12, font: timesRomanItalicFont, color: DARK_GRAY,
  });
  page.drawText('Verification ID', {
    x: width - 200, y: 90, size: 12, font: timesRomanItalicFont, color: DARK_GRAY,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

export async function generateNotesPDF(title: string, markdownContent: string): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let devanagariFont;
  const fontUrls = [
    '/fonts/NotoSansDevanagari-Regular.ttf',
    '/fonts/NotoSansDevanagari.ttf',
    'https://fonts.gstatic.com/s/notosansdevanagari/v26/TuGjUVpzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b6w.ttf',
  ];
  for (const fontUrl of fontUrls) {
    try {
      const fontRes = await fetch(fontUrl);
      if (!fontRes.ok) continue;
      const fontBytes = await fontRes.arrayBuffer();
      devanagariFont = await pdfDoc.embedFont(fontBytes);
      break;
    } catch(e) {
      continue;
    }
  }
  if (!devanagariFont) {
    console.error("Failed to load Devanagari font for notes PDF");
    devanagariFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  let page = pdfDoc.addPage([595, 842]); // A4 Portrait
  let { width, height } = page.getSize();
  let cursorY = height - 50;

  // Header
  page.drawText(title, { x: 50, y: cursorY, size: 20, font: devanagariFont, color: DARK_RED });
  cursorY -= 40;

  // Basic markdown split
  const lines = markdownContent.split('\n');
  for (const line of lines) {
    if (cursorY < 50) {
      page = pdfDoc.addPage([595, 842]);
      cursorY = height - 50;
    }
    
    // Very simple rendering, replace heading markers
    const cleanLine = line.replace(/#/g, '').trim();
    if (cleanLine) {
       page.drawText(cleanLine, {
         x: 50, y: cursorY, size: 12, font: devanagariFont, color: DARK_GRAY,
         maxWidth: width - 100
       });
       // Roughly estimate height for wrapping
       cursorY -= Math.ceil(cleanLine.length / 80) * 16 + 4;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

const fs = require('fs');
const path = require('path');

/**
 * Extract insurance details from PDF text
 * Uses pdf-parse for text-based PDFs, falls back to mock data for scanned/empty PDFs
 */
const extractFromPDF = async (filePath) => {
  let text = '';

  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    text = data.text || '';
  } catch (err) {
    console.log('PDF parse failed, using mock extraction:', err.message);
  }

  if (text.length > 50) {
    return parseInsuranceText(text);
  }

  // Fallback: return mock extracted data
  return getMockExtraction(filePath);
};

/**
 * Parse insurance-related fields from extracted text using regex patterns
 */
const parseInsuranceText = (text) => {
  const result = {
    policyNumber: null,
    insurer: null,
    vehicleNumber: null,
    startDate: null,
    expiryDate: null,
    premium: null,
    vehicleType: null,
    coverageType: null,
    raw: text.substring(0, 500),
  };

  // Policy Number patterns
  const policyPatterns = [
    /policy\s*(?:no|number|#)[:\s]*([A-Z0-9\-\/]+)/i,
    /certificate\s*(?:no|number)[:\s]*([A-Z0-9\-\/]+)/i,
    /(?:OG|P|INS)[/-]?\d{2}[/-]\d{4,}/,
  ];
  for (const p of policyPatterns) {
    const m = text.match(p);
    if (m) { result.policyNumber = (m[1] || m[0]).trim(); break; }
  }

  // Insurer name
  const insurers = ['ICICI Lombard', 'HDFC Ergo', 'Bajaj Allianz', 'New India Assurance', 'Tata AIG', 'Acko', 'Digit', 'GoDigit', 'National Insurance', 'Oriental Insurance', 'United India', 'SBI General', 'Reliance General', 'Cholamandalam', 'Royal Sundaram', 'Bharti AXA', 'Iffco Tokio', 'Future Generali'];
  for (const ins of insurers) {
    if (text.toLowerCase().includes(ins.toLowerCase())) { result.insurer = ins; break; }
  }

  // Vehicle number
  const vehMatch = text.match(/[A-Z]{2}\s*\d{1,2}\s*[A-Z]{1,3}\s*\d{1,4}/);
  if (vehMatch) result.vehicleNumber = vehMatch[0].replace(/\s/g, '');

  // Dates
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
  ];
  const dates = [];
  for (const dp of datePatterns) {
    let dm;
    while ((dm = dp.exec(text)) !== null) {
      try {
        const d = new Date(dm[0].replace(/[.]/g, '/'));
        if (!isNaN(d.getTime()) && d.getFullYear() > 2000) dates.push(d);
      } catch { /* skip */ }
    }
  }
  if (dates.length >= 2) {
    dates.sort((a, b) => a - b);
    result.startDate = dates[0].toISOString();
    result.expiryDate = dates[dates.length - 1].toISOString();
  } else if (dates.length === 1) {
    result.startDate = dates[0].toISOString();
  }

  // Premium
  const premMatch = text.match(/(?:premium|total)[:\s]*(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (premMatch) result.premium = parseFloat(premMatch[1].replace(/,/g, ''));

  // Coverage type
  if (/comprehensive/i.test(text)) result.coverageType = 'Comprehensive';
  else if (/third\s*party/i.test(text)) result.coverageType = 'Third Party';
  else if (/own\s*damage/i.test(text)) result.coverageType = 'Own Damage';

  // Vehicle type
  if (/two\s*wheeler|bike|scooter/i.test(text)) result.vehicleType = 'Two Wheeler';
  else if (/truck|lorry|goods/i.test(text)) result.vehicleType = 'Commercial';
  else if (/bus|passenger/i.test(text)) result.vehicleType = 'Passenger';
  else result.vehicleType = 'Private Car';

  return result;
};

/**
 * Mock extraction for scanned/unreadable PDFs
 */
const getMockExtraction = (filePath) => {
  const fileName = path.basename(filePath || '');
  return {
    policyNumber: `POL-${Date.now().toString().slice(-8)}`,
    insurer: 'Unable to detect — please fill manually',
    vehicleNumber: null,
    startDate: null,
    expiryDate: null,
    premium: null,
    vehicleType: 'Private Car',
    coverageType: null,
    raw: `Scanned/unreadable PDF: ${fileName}. Please fill details manually.`,
  };
};

module.exports = { extractFromPDF };

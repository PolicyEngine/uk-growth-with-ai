// The PDF page of each evidence-map row's printed value, so the value links
// to the page it is read from. Found by searching each PDF for the printed
// page number and the cited box, table or paragraph (16 Nov 2026). Rows on an
// HTML page link to that page; the IMF and PwC PDFs could not be searched by
// script (their servers refuse it), so those rows link to the document and
// name the page in their location.
export const PDF_PAGE = {
  'obr-efo-oct26-ai': 24,
  'obr-bp9': 50,
  'obr-efo-mar26-unemployment': 35,
  'obr-efo-mar26-wage': 36,
  'obr-efo-mar26-debt': 105,
  'obr-frs26': 91,
  'boe-mpr-nov26-expected': 59,
  'boe-mpr-nov26-sofar': 59,
  'ifs-gb26-capital': 35,
  'ifs-gb26-tfp': 37,
  'ifs-gb26-techgrowth': 26,
  'ifs-gb26-earnings': 24,
  'ifs-gb26-receipts': 25,
  'ifs-gb26-borrowing': 32,
  'ifs-wp2548-tfp': 23,
  'ifs-wp2548-output': 26,
  'niesr-aut26-boxa': 16,
  'ippr-gdp': 25,
  'ippr-jobs': 25,
  'benzell21': 4,
  'korinek-gdp': 31,
  'korinek-wage': 37,
  'korinek-unemployment': 31,
};

// The link for a row's value: its PDF page where known, else its page
export const valueHref = (r) => (r.url && PDF_PAGE[r.id] && /\.pdf$/i.test(r.url) ? `${r.url}#page=${PDF_PAGE[r.id]}` : r.url);

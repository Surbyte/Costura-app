// Excel export utility (no external libraries)
window.exportExcel = {
  // Format cell value
  cell: (v) => (v === undefined || v === null) ? '' : String(v),

  // Escape XML
  esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),

  // Generate XML Spreadsheet 2003 from sheet data
  buildSheet: (name, headers, rows) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${window.exportExcel.esc(name)}">
    <Table>`;
    // Header row
    xml += '<Row>';
    headers.forEach(h => { xml += `<Cell><Data ss:Type="String">${window.exportExcel.esc(h)}</Data></Cell>`; });
    xml += '</Row>';
    // Data rows
    rows.forEach(row => {
      xml += '<Row>';
      row.forEach(cell => {
        const val = window.exportExcel.cell(cell);
        const num = parseFloat(val);
        const type = (!isNaN(num) && val.trim() !== '') ? 'Number' : 'String';
        xml += `<Cell><Data ss:Type="${type}">${type === 'Number' ? num : window.exportExcel.esc(val)}</Data></Cell>`;
      });
      xml += '</Row>';
    });
    xml += `</Table></Worksheet></Workbook>`;
    return xml;
  },

  // Download workbook (array of {name, headers, rows})
  download: (sheets, filename) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">`;
    sheets.forEach(s => {
      xml += `<Worksheet ss:Name="${window.exportExcel.esc(s.name)}"><Table>`;
      // Header
      xml += '<Row>';
      s.headers.forEach(h => { xml += `<Cell><Data ss:Type="String">${window.exportExcel.esc(h)}</Data></Cell>`; });
      xml += '</Row>';
      // Data
      s.rows.forEach(row => {
        xml += '<Row>';
        row.forEach(cell => {
          const val = window.exportExcel.cell(cell);
          const num = parseFloat(val);
          const type = (!isNaN(num) && val.trim() !== '') ? 'Number' : 'String';
          xml += `<Cell><Data ss:Type="${type}">${type === 'Number' ? num : window.exportExcel.esc(val)}</Data></Cell>`;
        });
        xml += '</Row>';
      });
      xml += '</Table></Worksheet>';
    });
    xml += '</Workbook>';

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/\.xlsx?$/, '') + '.xls';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

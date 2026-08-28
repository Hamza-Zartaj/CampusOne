import ExcelJS from 'exceljs';

export const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const cellToValue = (cell) => {
  if (!cell) return '';
  const { value } = cell;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.text !== undefined) return value.text;
    if (value.result !== undefined) return value.result;
    if (value.richText) return value.richText.map((part) => part.text).join('');
  }
  return value;
};

export const readFirstWorksheetRows = async (buffer, { defval } = {}) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('The workbook does not contain a worksheet');

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const header = String(cellToValue(cell)).trim();
    if (header) headers[columnNumber] = header;
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const item = {};
    let hasValue = false;

    headers.forEach((header, columnNumber) => {
      if (!header) return;
      const rawValue = cellToValue(row.getCell(columnNumber));
      const value = rawValue === '' && defval !== undefined ? defval : rawValue;
      item[header] = value;
      if (value !== '' && value !== null && value !== undefined) hasValue = true;
    });

    if (hasValue) rows.push(item);
  });

  return rows;
};

export const createWorkbookBuffer = async (sheets) => {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, rows, columns, header, freezeHeader }) => {
    const worksheet = workbook.addWorksheet(name);
    if (header) {
      worksheet.columns = header.map((key, index) => ({
        header: key,
        key,
        width: columns?.[index]?.width || columns?.[index]?.wch || 16,
      }));
      rows.forEach((row) => worksheet.addRow(row));
    } else {
      worksheet.addRows(rows);
      columns?.forEach((column, index) => {
        worksheet.getColumn(index + 1).width = column.width || column.wch || 16;
      });
    }

    if (freezeHeader) {
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
};

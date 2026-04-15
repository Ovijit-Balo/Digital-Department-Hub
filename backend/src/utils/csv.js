const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const toCsv = (rows) => {
  if (!rows.length) {
    return '';
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  rows.forEach((row) => {
    const line = headers.map((header) => escapeCsv(row[header])).join(',');
    lines.push(line);
  });

  return lines.join('\n');
};

module.exports = toCsv;

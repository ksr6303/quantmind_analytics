export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // extract headers
  const headers = Object.keys(data[0]);

  // convert data to csv format
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle strings containing commas (wrap in quotes)
        if (typeof value === 'string') {
           value = value.replace(/"/g, '""'); // Escape existing quotes
           if (value.includes(',') || value.includes('"') || value.includes('\n')) {
              return `"${value}"`;
           }
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create blob and link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

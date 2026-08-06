const { exportCSV, exportExcel, exportPDF } = require('../services/exportService');
const { logAudit } = require('../services/auditService');

exports.downloadCSV = (req, res) => {
  try {
    const roundNum = req.query.round ? parseInt(req.query.round) : null;
    const csvContent = exportCSV(roundNum);

    logAudit(req.user.id, req.user.username, 'EXPORT_CSV', `Exported CSV results for round ${roundNum || 'current'}`, req.ip);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Gotham_Competition_Results_Round_${roundNum || 'Current'}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV export.', details: err.message });
  }
};

exports.downloadExcel = (req, res) => {
  try {
    const roundNum = req.query.round ? parseInt(req.query.round) : null;
    const excelBuffer = exportExcel(roundNum);

    logAudit(req.user.id, req.user.username, 'EXPORT_EXCEL', `Exported Excel results for round ${roundNum || 'current'}`, req.ip);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Gotham_Competition_Results_Round_${roundNum || 'Current'}.xlsx"`);
    res.status(200).send(excelBuffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Excel export.', details: err.message });
  }
};

exports.downloadPDF = (req, res) => {
  try {
    const roundNum = req.query.round ? parseInt(req.query.round) : null;

    logAudit(req.user.id, req.user.username, 'EXPORT_PDF', `Exported PDF report for round ${roundNum || 'current'}`, req.ip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Gotham_Competition_Results_Round_${roundNum || 'Current'}.pdf"`);

    exportPDF(roundNum, res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF report.', details: err.message });
  }
};

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Uploaded file exceeds maximum allowed filesize limit.' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;

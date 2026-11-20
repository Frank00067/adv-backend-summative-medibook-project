module.exports = (err, req, res, next) => {
  if (err.status) {
    const body = { error: err.message };
    if (err.waitlistOffered) body.waitlist_offered = true;
    return res.status(err.status).json(body);
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'Cannot delete: record is referenced by appointments' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

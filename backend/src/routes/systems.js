const express = require('express');
const { search } = require('../data/systems');

const router = express.Router();

router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) {
    return res.json([]);
  }
  const results = search(q, 10);
  res.json(results);
});

module.exports = router;

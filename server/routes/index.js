var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.send('nothing here');
});

module.exports = router;

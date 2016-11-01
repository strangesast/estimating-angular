var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

router.get('/', function(req, res, next) {
  let state = mongoose.connection.readyState;
  res.json({
    'status': state == 0 ? 'disconnected' : state == 1 ? 'connected' : state == 2 ? 'connecting' : state == 3 ? 'disconnecting' : 'unknown'
  });
});

router.route('/:object/:id?')
.get(function(req, res, next) {
  // find object with id
  let id = req.params.id;
  let object = req.params.object;
  return res.json({object: object, id: id});

})
.all(function() {
  // check write permissions

})
.post(function(req, res, next) {
  // if id
  //   completely replace with id
  // if not id
  //   create new (id undefined)
  let id = req.params.id;
  let object = req.params.object;
  return res.json({object: object, id: id});

})
.put(function(req, res, next) {
  // modify with id (id required)
  let id = req.params.id;
  let object = req.params.object;
  return res.json({object: object, id: id});

})
.delete(function(req, res, next) {
  // if id
  //   remove with id
  // if not id
  //   remove all
  let id = req.params.id;
  let object = req.params.object;
  return res.json({object: object, id: id});

}).all(function(req, res, next) {
  // invalid method
  return res.json({});

});

module.exports = router;

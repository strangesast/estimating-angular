var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var Job = require('../models/job');
var Phase = require('../models/phase');
var Building = require('../models/building');
var Component = require('../models/component');
var Account = require('../models/account');

var nameToModel = function(name) {
  switch(name) {
    case 'jobs':
      return Job;
    case 'users':
      return Account;
    case 'phases':
      return Phase;
    case 'buildings':
      return Building;
    case 'components':
      return Component;
    case 'parts':
      throw new Error('model not implemented');
    default:
      throw new Error('name "'+name+'" does not represent valid resource');
  }
};

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
  let name = req.params.object;
  let Model = nameToModel(name);
  var prom;
  if(id != null) {
    prom = Model.findById(id)
  } else {
    prom = Model.find(req.body || {})
  }
  prom.then(function(docs) {
    res.json(docs);

  }).catch(function(err) {
    err.status = 400;
    next(err);
  });
})
.all(function(req, res, next) {
  // check write permissions
  if(req.user == null) {
    let err = new Error('not authenticated');
    err.status = 403;
    return next(err);
  }
  return next();
})
.post(function(req, res, next) {
  let id = req.params.id;
  let name = req.params.object;
  let Model = nameToModel(name);
  if(id != null) {
    // completely replace with id
    Model.findByIdAndUpdate(id, req.body).then(function(result) {
      res.json(result);

    }).catch(function(err) {
      err.status = 400;
      next(err);

    });
  } else {
    // create new (id undefined)
    let model = new Model(req.body);
    model.save().then(function(doc) {
      res.status(201);
      res.json(doc);

    }).catch(function(err) {
      err.status = 400;
      next(err);
    });
  }
})
.put(function(req, res, next) {
  // modify with id
  // modify by query
  let id = req.params.id;
  let name = req.params.object;
  let Model = nameToModel(name);
  if(id != null) {
    Model.findByIdAndUpdate(id, { $set: req.body }).then(function(result) {
      res.json(result);

    }).catch(function(err) {
      err.status = 400;
      next(err);
    });
  } else {
    // may want to use query (name, etc) with
    // Model.findOneAndUpdate
    let err = new Error('id required');
    err.status = 400;
    next(err);
  }
})
.delete(function(req, res, next) {
  // if id
  //   remove with id
  // if not id
  //   remove all
  let id = req.params.id;
  let name = req.params.object;
  let Model = nameToModel(name);
  var prom;
  if(id != null) {
    prom = Model.findByIdAndRemove(id);
  } else {
    prom = Model.remove(req.body || {});
  }
  prom.then(function(result) {
    res.json(result);

  }).catch(function(err) {
    err.status = 400;
    next(err);

  });

}).all(function(req, res, next) {
  // invalid method
  let err = new Error('not supported');
  err.status = 405;
  next(err);

});

module.exports = router;

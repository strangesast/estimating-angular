var express = require('express');
var multer = require('multer');
var passport = require('passport');

var router = express.Router();
var upload = multer();

var Account = require('../models/account');

router.get('/', function(req, res, next) {
  if(req.user) {
    return res.json({
      user: req.user,
      status: 'logged in'
    });
  }
  res.json({
    status: 'not logged in'
  });
});

router.post('/register$', upload.array(), function(req, res, next) {
  if(req.user) {
    let err = new Error('already logged in');
    err.status = 400;
    return next(err);
  }
  return Account.register(new Account(req.body), req.body.password, function(err, account) {
    if (err) {
      // 'ValidationError':
      // 'MissingPasswordError':
      // 'UserExistsError':
      var message = err.message;
      if(err.errors) message += ' (' + Object.keys(err.errors).map((n)=>err.errors[n].message).join(', ') + ')';
      err.status = 400;
      err.message = message;
      return next(err);
    }
    res.status(201);
    res.send();
    // or automatically log in (probably not desirable)
    //return passport.authenticate('local')(req, res, function() {
    //  return res.redirect('./');
    //});
  });
});

router.post('/login$', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err);
    if (!user) {
      res.status(401);
      res.json({
        message: info
      });
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('./');
    });
  })(req, res, next);
});

router.get('/logout$', function(req, res, next) {
  req.logout();
  return res.redirect('./');
});


module.exports = router;

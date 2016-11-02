var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

// passport
var session = require('express-session');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

var routes = require('./routes/index');
var api = require('./routes/api');
var auth = require('./routes/auth');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const MONGO_URL = 'mongodb://localhost:27017/estimating';
mongoose.connect(MONGO_URL, function(err) {
  if(err) throw err;
  console.log('connected at', MONGO_URL);
});

app.use(session({
  secret: 'toastTOAST',
  resave: true,
  saveUninitialized: true,
  cookie: {
    expires: true,
    maxAge: 60000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

var Account = require('./models/account');
passport.use(new localStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

app.use('/', routes);
app.use('/api', api);
app.use('/user', auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: {}
  });
});


module.exports = app;

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;
var ObjectId = Schema.Types.ObjectId;

var isValidParent = require('../resources/parentValidation').isValidParent;

const MODEL_NAME = 'Component';

var lastSchema = new Schema({
  // referenced doc job (may be redundant)
  job: { type: ObjectId, ref: 'Job',       required: true },
  // referenced doc
  id:  { type: ObjectId, ref: 'Component', required: true },
  // verion of referenced doc
  v: { type: Number, required: true }
});

var schema = new Schema({
  name:        { type: String,  required: true },
  job:         { type: ObjectId, required: true, ref: 'Job'},
  last:        lastSchema,
  phase:       { type: ObjectId, default: null, ref: 'Phase' },
  building:    { type: ObjectId, default: null, ref: 'Building' },
  'parent':    { type: ObjectId, default: null, ref: 'Component' },
  description: { type: String,   default: '',   required: true },
  part:        String

}, {timestamps: true});

schema.pre('validate', function(next) {
  return isValidParent(this, this.constructor).then(function(valid) {
    if(valid) {
      return next()
    }
    next(new Error('invalid parent'));

  }).catch(function(err) {
    next(err);
  });
});

module.exports = mongoose.model(MODEL_NAME, schema);

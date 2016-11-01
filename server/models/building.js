var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;
var ObjectId = Schema.Types.ObjectId;

var isValidParent = require('../resources/parentValidation').isValidParent;

const MODEL_NAME = 'Building';

var schema = new Schema({
  name:        { type: String, required: true },
  job:         { type: ObjectId, ref: 'Job' },
  'parent':    { type: ObjectId, ref: 'Phase' },
  description: { type: String, default: '', required: true }

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

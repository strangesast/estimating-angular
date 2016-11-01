var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Mixed = Schema.Types.Mixed;
var ObjectId = Schema.Types.ObjectId;

const MODEL_NAME = 'Job';

var schema = new Schema({
  name: {
    type: String,
    required: true
  },
  owner: {
    type: ObjectId,
    ref: 'Account',
    required: true
  },
  description: {
    type: String,
    required: true,
    default: ''
  }
});

module.exports = mongoose.model(MODEL_NAME, schema);

module.exports.isValidParent = function(doc, constructor) {
  // climb up parent tree
  return new Promise(function(resolve, reject) {
    var _parent = doc['parent'];
    if(_parent == null) return resolve(true);
    _parent = String(_parent);

    function recurse(id) {
      if(id == null) return resolve(true);
      if(String(id) == _parent) return resolve(false);
      constructor.findById(id).then(function(nextdoc) {
        recurse(nextdoc != null ? nextdoc['parent'] : null);
      }).catch(function(err) {
        return reject(err);
      });
    }
  });
};

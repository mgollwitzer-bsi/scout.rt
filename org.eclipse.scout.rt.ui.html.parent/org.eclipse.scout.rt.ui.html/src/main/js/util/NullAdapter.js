scout.NullAdapter = function() {
  scout.NullAdapter.parent.call(this);
};

scout.inherits(scout.NullAdapter, scout.ModelAdapter);

scout.NullAdapter.prototype._renderSelected = function(selected) {
  // nop
};

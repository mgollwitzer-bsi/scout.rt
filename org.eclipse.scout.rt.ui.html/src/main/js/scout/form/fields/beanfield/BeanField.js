/**
 * Base class for fields where the value should be visualized.
 */
scout.BeanField = function() {
  scout.BeanField.parent.call(this);
};
scout.inherits(scout.BeanField, scout.ValueField);

scout.BeanField.prototype._render = function($parent) {
  this.addContainer($parent, 'bean-field');
  this.addLabel();
  this.addField($('<div>'));
  this.addStatus();
  this._appLinkKeyStroke = new scout.AppLinkKeyStroke(this, this._onAppLinkAction);
};

scout.BeanField.prototype._renderProperties = function() {
  scout.BeanField.parent.prototype._renderProperties.call(this);
  this._renderValue(this.value);
};

scout.BeanField.prototype.init = function(model, session) {
  scout.BeanField.parent.prototype.init.call(this, model, session);
  this.keyStrokeAdapter.registerKeyStroke(this._appLinkKeyStroke);
};

/**
 * @override
 */
scout.BeanField.prototype._renderDisplayText = function() {
  // nop
};

scout.BeanField.prototype._renderValue = function() {
  // to be implemented by the subclass
};

scout.BeanField.prototype._sendAppLinkAction = function(ref) {
  this.session.send(this.id, 'appLinkAction', {
    ref: ref
  });
};

scout.BeanField.prototype._onAppLinkAction = function(event) {
  var $target = $(event.target);
  var ref = $target.data('ref');
  this._sendAppLinkAction(ref);
};

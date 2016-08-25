/*******************************************************************************
 * Copyright (c) 2014-2015 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.OutlineViewButton = function() {
  scout.OutlineViewButton.parent.call(this);
  this._addAdapterProperties('outline');
};
scout.inherits(scout.OutlineViewButton, scout.ViewButton);

/**
 * Don't await server response to make it more responsive and offline capable.
 * @override Action.js
 */
scout.OutlineViewButton.prototype.beforeSendDoAction = function() {
  if (this.outline) {
    this.session.desktop.bringOutlineToFront(this.outline);
  }
};

scout.OutlineViewButton.prototype.onOutlineChanged = function(outline) {
  var selected = !!outline && this.outline === outline;
  this.setSelected(selected);
};

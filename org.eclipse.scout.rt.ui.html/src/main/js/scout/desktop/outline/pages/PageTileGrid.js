/*******************************************************************************
 * Copyright (c) 2014-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
scout.PageTileGrid = function() {
  scout.PageTileGrid.parent.call(this);
  this.outline = null;
  this.page = null;
  this.nodes = null;
  this.withPlaceholders = true;
  this.scrollable = false;
  this.renderAnimationEnabled = true;
  this.startupAnimationEnabled = true;
  this._outlineNodeChangedHandler = this._onOutlineNodeChanged.bind(this);
  this._outlineStructureChangedHandler = this._onOutlineStructureChanged.bind(this);
};
scout.inherits(scout.PageTileGrid, scout.TileGrid);

scout.PageTileGrid.prototype._init = function(model) {
  scout.PageTileGrid.parent.prototype._init.call(this, model);
  this.nodes = this.nodes || (this.page && this.page.childNodes) || (this.outline && this.outline.nodes);
  this.setOutline(this.outline);
  this.setPage(this.page);
  this.setNodes(this.nodes);
};

scout.PageTileGrid.prototype._destroy = function() {
  this.setOutline(null);
  this.setPage(null);
  this.setNodes(null);
  scout.PageTileGrid.parent.prototype._destroy.call(this);
};

/**
 * @override
 */
scout.PageTileGrid.prototype._createKeyStrokeContext = function() {
  return new scout.KeyStrokeContext();
};

/**
 * @override
 */
scout.PageTileGrid.prototype._initKeyStrokeContext = function() {
  scout.PageTileGrid.parent.prototype._initKeyStrokeContext.call(this);
  this.keyStrokeContext.$bindTarget = this.session.$entryPoint;
  this.keyStrokeContext.registerKeyStroke([
    new scout.PageTileGridSelectKeyStroke(this)
  ]);
};

scout.PageTileGrid.prototype.setOutline = function(outline) {
  if (this.outline) {
    this.outline.off('nodeChanged pageChanged', this._outlineNodeChangedHandler);
    this.outline.off('nodesDeleted', this._outlineStructureChangedHandler);
    this.outline.off('nodesInserted', this._outlineStructureChangedHandler);
    this.outline.off('allChildNodesDeleted', this._outlineStructureChangedHandler);
    this.outline.off('childNodeOrderChanged', this._outlineStructureChangedHandler);
  }
  this._setProperty('outline', outline);
  if (this.outline) {
    this.outline.on('nodeChanged pageChanged', this._outlineNodeChangedHandler);
    this.outline.on('nodesDeleted', this._outlineStructureChangedHandler);
    this.outline.on('nodesInserted', this._outlineStructureChangedHandler);
    this.outline.on('allChildNodesDeleted', this._outlineStructureChangedHandler);
    this.outline.on('childNodeOrderChanged', this._outlineStructureChangedHandler);
  }
};

scout.PageTileGrid.prototype.setPage = function(page) {
  this._setProperty('page', page);
};

scout.PageTileGrid.prototype.setNodes = function(nodes) {
  this._setProperty('nodes', nodes);
  this._rebuild();
};

scout.PageTileGrid.prototype._createPageTiles = function(pages) {
  return (pages || []).map(function(page) {
    return this._createPageTile(page);
  }, this);
};

scout.PageTileGrid.prototype._createPageTile = function(page) {
  var button = scout.create('PageTileButton', {
    parent: this,
    outline: this.outline,
    page: page
  });
  var tile = scout.create('FormFieldTile', {
    parent: this,
    colorScheme: 'default-inverted',
    tileWidget: button
  });
  page.tile = tile;
  return tile;
};

scout.PageTileGrid.prototype._rebuild = function() {
  this.setTiles(this._createPageTiles(this.nodes));
};

scout.PageTileGrid.prototype._onOutlineNodeChanged = function(event) {
  var page = event.node || event.page;
  var tile = page.tile;
  if (!tile) {
    return;
  }
  tile.tileWidget.notifyPageChanged();
};

scout.PageTileGrid.prototype._onOutlineStructureChanged = function(event) {
  if (this.page) {
    if (this.page === event.parentNode) {
      this.setNodes(this.page.childNodes);
    }
  }
  else {
    var eventContainsTopLevelNode = event.nodes && event.nodes.some(function(node) {
      return !node.parentNode;
    }) || event.type === 'allChildNodesDeleted';
    // only rebuild if top level nodes change
    if (eventContainsTopLevelNode) {
      this.setNodes(this.outline.nodes);
    }
  }
};
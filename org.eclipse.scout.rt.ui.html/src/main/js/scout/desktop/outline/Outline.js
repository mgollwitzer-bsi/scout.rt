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

/**
 * @extends {scout.Tree}
 * @class
 * @constructor
 */
scout.Outline = function() {
  scout.Outline.parent.call(this);
  this._addWidgetProperties(['defaultDetailForm', 'views', 'selectedViewTabs', 'dialogs', 'messageBoxes', 'fileChoosers']);

  this.toggleBreadcrumbStyleEnabled = true;
  this.navigateButtonsVisible = true;
  this.dialogs = [];
  this.views = [];
  this.messageBoxes = [];
  this.fileChoosers = [];
  this.navigateUpInProgress = false; // see NavigateUpButton.js
  this._additionalContainerClasses += ' outline';
  this._treeItemPaddingLeft = 37;
  this._treeItemPaddingLevel = 20;
  this.inBackground = false;
  this.embedDetailContent = false;
  this.compact = false;
  this.formController;
  this.messageBoxController;
  this.fileChooserController;
  this._scrolldirections = 'y';
  this.titleVisible = true;
  this.mediator;
};
scout.inherits(scout.Outline, scout.Tree);

scout.Outline.prototype._init = function(model) {
  // add filter before first traversal of tree -> tree is only traversed once.
  this.addFilter(new scout.DetailTableTreeFilter(), true);
  scout.Outline.parent.prototype._init.call(this, model);

  this.mediator = this._createMediator();
  this.formController = scout.create('FormController', {
    displayParent: this,
    session: this.session
  });
  this.messageBoxController = new scout.MessageBoxController(this, this.session);
  this.fileChooserController = new scout.FileChooserController(this, this.session);
  this.resolveTextKeys(['title']);
  this._setDefaultDetailForm(this.defaultDetailForm);
  this._detailContentDestroyHandler = this._onDetailContentDestroy.bind(this);

  // menu bars
  this.titleMenuBar = scout.create('MenuBar', {
    parent: this,
    menuOrder: new scout.GroupBoxMenuItemsOrder()
  });
  this.nodeMenuBar = scout.create('MenuBar', {
    parent: this,
    menuOrder: new scout.GroupBoxMenuItemsOrder()
  });
  this.nodeMenuBar.bottom();
  this.detailMenuBar = scout.create('MenuBar', {
    parent: this,
    menuOrder: new scout.GroupBoxMenuItemsOrder()
  });
  this.detailMenuBar.bottom();

  this._setDefaultDetailForm(this.defaultDetailForm);
  this._setOutlineOverviewVisible(this.outlineOverviewVisible);

  this._setViews(this.views);
  this._setMenus(this.menus);
  this.updateDetailContent();
};

/**
 * This function returns the outline mediator instance. When we're in an online Scout application we must
 * return a null instance here, because mediation is done server-side.
 */
scout.Outline.prototype._createMediator = function() {
  return scout.create('OutlineMediator');
};

/**
 * @override Tree.js
 */
scout.Outline.prototype._createTreeNode = function(nodeModel) {
  nodeModel = scout.nvl(nodeModel, {});
  nodeModel.parent = this;
  return scout.create('Page', nodeModel);
};

scout.Outline.prototype._applyNodeDefaultValues = function(node) {
  scout.defaultValues.applyTo(node, 'Page');
};

scout.Outline.prototype._createKeyStrokeContext = function() {
  return new scout.OutlineKeyStrokeContext(this);
};

scout.Outline.prototype._filterMenus = function(menus, destination, onlyVisible, enableDisableKeyStroke) {
  //show no contextmenues
  return [];
};

/**
 * @override Tree.js
 */
scout.Outline.prototype._initTreeKeyStrokeContext = function() {
  var modifierBitMask = scout.keyStrokeModifier.CTRL | scout.keyStrokeModifier.SHIFT; // NOSONAR

  this.keyStrokeContext.registerKeyStroke([
    new scout.TreeNavigationUpKeyStroke(this, modifierBitMask),
    new scout.TreeNavigationDownKeyStroke(this, modifierBitMask),
    new scout.OutlineNavigateToTopKeyStroke(this, modifierBitMask),
    new scout.TreeNavigationEndKeyStroke(this, modifierBitMask),
    new scout.TreeCollapseOrDrillUpKeyStroke(this, modifierBitMask),
    new scout.TreeExpandOrDrillDownKeyStroke(this, modifierBitMask)
  ]);

  this.keyStrokeContext.$bindTarget = function() {
    return this.session.$entryPoint;
  }.bind(this);
};

/**
 * @override
 */
scout.Outline.prototype._render = function() {
  scout.Outline.parent.prototype._render.call(this);

  // Override layout
  this.htmlComp.setLayout(new scout.OutlineLayout(this));
  this._renderCompact();
  this._renderEmbedDetailContent();
  this._renderDetailContent();
  this._renderDetailMenuBarVisible();
  this._renderNodeMenuBarVisible();
};

scout.Outline.prototype._renderProperties = function() {
  scout.Outline.parent.prototype._renderProperties.call(this);
  this._renderTitle();
  this._renderTitleMenuBar();
};

/**
 * @override Tree.js
 */
scout.Outline.prototype._remove = function() {
  scout.Outline.parent.prototype._remove.call(this);
  this._removeTitle();
};

scout.Outline.prototype._renderTitle = function() {
  if (this.titleVisible) {
    if (!this.$title) {
      this.$title = this.$container.prependDiv('outline-title');

      // Listener is added to the text instead of the title to not get the clicks on the title menubar
      this.$titleText = this.$title.prependDiv('outline-title-text')
        .on('click', this._onTitleClick.bind(this));
    }
    this.$titleText.text(this.title);
  }
};

scout.Outline.prototype._removeTitle = function() {
  if (this.titleVisible) {
    this.$title.remove();
    this.$title = null;
  }
};

scout.Outline.prototype._renderTitleMenuBar = function() {
  if (this.titleVisible) {
    this.titleMenuBar.render(this.$title);
    this.titleMenuBar.$container.addClass('prevent-initial-focus');
  }
};

/**
 * @override
 */
scout.Outline.prototype._renderEnabled = function() {
  scout.Outline.parent.prototype._renderEnabled.call(this);
  this.$container.setTabbable(false);
};

/**
 * @override
 */
scout.Outline.prototype._initTreeNodeInternal = function(node, parentNode) {
  scout.Outline.parent.prototype._initTreeNodeInternal.call(this, node, parentNode);
  this._initDetailTableAndForm(node);
  this.trigger('pageInit', {
    page: node
  });
};

scout.Outline.prototype._initDetailTableAndForm = function(node) {
  if (node.detailTable) {
    this._initDetailTable(node);
  }
  if (node.detailForm) {
    this._initDetailForm(node);
  }
};

scout.Outline.prototype._initDetailTable = function(node) {
  if (this.navigateButtonsVisible) {
    this._appendNavigateButtonsForDetailTable(node);
  }
};

scout.Outline.prototype._initDetailForm = function(node) {
  if (this.navigateButtonsVisible) {
    this._appendNavigateButtonsForDetailForm(node);
  }

  // Mark form as detail form
  node.detailForm.detailForm = true;
  node.detailForm.one('destroy', function() {
    // Unlink detail form if it was closed. May happen in the following case:
    // The form gets closed on execPageDeactivated. No pageChanged event will
    // be fired because the deactivated page is not selected anymore.
    node.detailForm = null;
    // Also make sure other objects hold no reference to a destroyed form (e.g. bench)
    this._triggerPageChanged(node);
  }.bind(this));
};

/**
 * @override
 */
scout.Outline.prototype._decorateNode = function(node) {
  scout.Outline.parent.prototype._decorateNode.call(this, node);
  if (this.session.inspector) {
    scout.inspector.applyInfo(node, node.$node);
  }
};

scout.Outline.prototype._createNavigateButtons = function(node, staticMenus) {
  var menus = scout.arrays.ensure(staticMenus);
  if (!this._hasMenu(menus, scout.NavigateUpButton)) {
    var upButton = scout.create('NavigateUpButton', {
      parent: this,
      outline: this,
      node: node
    });
    menus.push(upButton);
  }
  if (!this._hasMenu(menus, scout.NavigateDownButton)) {
    var downButton = scout.create('NavigateDownButton', {
      parent: this,
      outline: this,
      node: node
    });
    menus.push(downButton);
  }
  return menus;
};

scout.Outline.prototype._getMenu = function(menus, menuClass) {
  for (var i = 0; i < menus.length; i++) {
    if (menus[i] instanceof menuClass) {
      return menus[i];
    }
  }
  return null;
};

scout.Outline.prototype._hasMenu = function(menus, menuClass) {
  return this._getMenu(menus, menuClass) !== null;
};

scout.Outline.prototype._onTitleClick = function(event) {
  this.navigateToTop();
};

scout.Outline.prototype.navigateToTop = function() {
  this.deselectAll();
  this.collapseAll();
  this.handleInitialExpanded();
};

scout.Outline.prototype.handleInitialExpanded = function() {
  this._visitNodes(this.nodes, function(node) {
    if (node.initialExpanded) {
      this.expandNode(node, {
        renderExpansion: true
      });
    }
  }.bind(this));
};

scout.Outline.prototype._onNodeDeleted = function(node) {
  // Destroy table, which is attached at the root adapter. Form gets destroyed by form close event
  if (node.detailTable) {
    node.detailTable.destroy();
    node.detailTable = null;
  }
  // If last node is removed, navigate back to top
  if (this.nodes.length === 0) {
    this.navigateToTop();
  }
};

scout.Outline.prototype.selectNodes = function(nodes, debounceSend) {
  nodes = scout.arrays.ensure(nodes);
  if (nodes.length > 0 && this.isNodeSelected(nodes[0])) {
    // Already selected, do nothing
    return;
  }
  if (nodes.length === 0 && this.selectedNodes.length === 0) {
    // Already unselected, do nothing
    return;
  }
  if (this.navigateUpInProgress) {
    this.navigateUpInProgress = false;
  } else {
    if (nodes.length === 1) {
      // When a node is selected, the detail form should never be hidden
      this.setDetailFormVisibleByUi(nodes[0], true);
    }
  }
  scout.Outline.parent.prototype.selectNodes.call(this, nodes, debounceSend);
  this.updateDetailContent();
};

scout.Outline.prototype._setDefaultDetailForm = function(defaultDetailForm) {
  this._setProperty('defaultDetailForm', defaultDetailForm);
  this._updateDetailForm();
};

scout.Outline.prototype._setOutlineOverviewVisible = function(outlineOverviewVisible) {
  this._setProperty('outlineOverviewVisible', outlineOverviewVisible);
  this._updateDetailForm();
};

scout.Outline.prototype._updateDetailForm = function() {
  if (this.defaultDetailForm) {
    if (this.outlineOverview) {
      this.outlineOverview.destroy();
      this._setProperty('outlineOverview', null);
    }
  } else {
    if (this.outlineOverviewVisible) {
      if (!this.outlineOverview) {
        // Create outlineOverview if no defaultDetailForm is available
        this._setProperty('outlineOverview', scout.create('OutlineOverview', {
          parent: this,
          outline: this
        }));
      }
    } else {
      if (this.outlineOverview) {
        this.outlineOverview.destroy();
        this._setProperty('outlineOverview', null);
      }
    }

  }
};

scout.Outline.prototype._setNavigateButtonsVisible = function(navigateButtonsVisible) {
  this._setProperty('navigateButtonsVisible', navigateButtonsVisible);
  this._visitNodes(this.nodes, this._setNavigateButtonsVisibleForNode.bind(this));
};

scout.Outline.prototype._setNavigateButtonsVisibleForNode = function(node, parentNode) {
  if (this.navigateButtonsVisible) {
    if (node.detailForm) {
      this._appendNavigateButtonsForDetailForm(node);
    }
    if (node.detailTable) {
      this._appendNavigateButtonsForDetailTable(node);
    }
  } else {
    if (node.detailForm) {
      this._removeNavigateButtonsForDetailForm(node);
    }
    if (node.detailTable) {
      this._removeNavigateButtonsForDetailTable(node);
    }
  }
};

scout.Outline.prototype._appendNavigateButtonsForDetailForm = function(node) {
  var menus = this._createNavigateButtons(node, node.detailForm.staticMenus);
  node.detailForm.rootGroupBox.setStaticMenus(menus);
};

scout.Outline.prototype._appendNavigateButtonsForDetailTable = function(node) {
  var menus = this._createNavigateButtons(node, node.detailTable.staticMenus);
  node.detailTable.setStaticMenus(menus);
};

scout.Outline.prototype._removeNavigateButtonsForDetailForm = function(node) {
  var staticMenus = [];
  node.detailForm.rootGroupBox.staticMenus.forEach(function(menu) {
    if (menu instanceof scout.NavigateUpButton || menu instanceof scout.NavigateDownButton) {
      menu.destroy();
    } else {
      staticMenus.push(menu);
    }
  });
  node.detailForm.rootGroupBox.setStaticMenus(staticMenus);
};

scout.Outline.prototype._removeNavigateButtonsForDetailTable = function(node) {
  var staticMenus = [];
  node.detailTable.staticMenus.forEach(function(menu) {
    if (menu instanceof scout.NavigateUpButton || menu instanceof scout.NavigateDownButton) {
      menu.destroy();
    } else {
      staticMenus.push(menu);
    }
  });
  node.detailTable.setStaticMenus(staticMenus);
};

/**
 * @returns {scout.TableRow} the selected row or null when no row is selected. When multiple rows are selected
 *    the first selected row is returned.
 */
scout.Outline.prototype.selectedRow = function() {
  var node = this.selectedNode();
  if (!node || !node.detailTable) {
    return null;
  }
  return node.detailTable.selectedRow();
};

scout.Outline.prototype._applyUpdatedNodeProperties = function(oldNode, updatedNode) {
  var propertiesChanged = scout.Outline.parent.prototype._applyUpdatedNodeProperties.call(this, oldNode, updatedNode);
  if (oldNode.modelClass !== updatedNode.modelClass) {
    oldNode.modelClass = updatedNode.modelClass;
    propertiesChanged = true;
  }
  if (oldNode.classId !== updatedNode.classId) {
    oldNode.classId = updatedNode.classId;
    propertiesChanged = true;
  }
  if (oldNode.nodeType !== updatedNode.nodeType) {
    oldNode.nodeType = updatedNode.nodeType;
    propertiesChanged = true;
  }
  return propertiesChanged;
};

/**
 * Called by updateItemPath.
 *
 * @override
 */
scout.Outline.prototype._isGroupingEnd = function(node) {
  return node.nodeType === scout.Page.NodeType.TABLE;
};

/**
 * Disabled for outlines because outline may be resized.
 */
scout.Outline.prototype._isTruncatedNodeTooltipEnabled = function() {
  return false;
};

scout.Outline.prototype.setDetailFormVisibleByUi = function(node, visible) {
  node.detailFormVisibleByUi = visible;
  this._triggerPageChanged(node);
};

scout.Outline.prototype.validateFocus = function() {
  this.session.focusManager.validateFocus();
};

scout.Outline.prototype.sendToBack = function() {
  this.inBackground = true;
  this._renderInBackground();

  // Detach child dialogs, message boxes and file choosers, not views.
  this.formController.detachDialogs();
  this.messageBoxController.detach();
  this.fileChooserController.detach();
};

scout.Outline.prototype.bringToFront = function() {
  this.inBackground = false;
  this._renderInBackground();

  // Attach child dialogs, message boxes and file choosers.
  this.formController.attachDialogs();
  this.messageBoxController.attach();
  this.fileChooserController.attach();
};

scout.Outline.prototype._renderInBackground = function() {
  this.$container.toggleClass('in-background', this.inBackground);
};

scout.Outline.prototype._renderCompact = function() {
  this.$container.toggleClass('compact', this.compact);
  this.invalidateLayoutTree();
};

scout.Outline.prototype._renderEmbedDetailContent = function() {
  this.$data.toggleClass('has-detail-content', this.embedDetailContent);
  this.invalidateLayoutTree();
};

scout.Outline.prototype._renderDetailContent = function() {
  if (!this.detailContent || this.detailContent.rendered) {
    return;
  }
  var page = this.selectedNode();
  if (!page.rendered) {
    return;
  }

  this.detailContent.render(page.$node);
  if (this.detailContent.htmlComp) {
    this.detailContent.htmlComp.validateRoot = false;
    this.detailContent.htmlComp.pixelBasedSizing = true;
  }
  this._ensurePageLayout(page);
  this.$data.addClass('detail-content-visible');
};

scout.Outline.prototype._ensurePageLayout = function(page) {
  // selected page now has content (menubar and form) -> needs a layout
  // always create new htmlComp, otherwise we would have to remove them when $node or outline gets remvoed
  page.htmlComp = scout.HtmlComponent.install(page.$node, this.session);
  page.htmlComp.setLayout(new scout.PageLayout(this, page));
};

scout.Outline.prototype._removeDetailContent = function() {
  if (!this.detailContent) {
    return;
  }
  this.detailContent.remove();
  this.$data.removeClass('detail-content-visible');
};

scout.Outline.prototype._postRenderViewRange = function() {
  scout.Outline.parent.prototype._postRenderViewRange.call(this);
  this._renderDetailContent();
  this._renderDetailMenuBarVisible();
  this._renderNodeMenuBarVisible();
};

scout.Outline.prototype.setCompact = function(compact) {
  this.setProperty('compact', compact);
};

scout.Outline.prototype.setEmbedDetailContent = function(embedDetailContent) {
  this.setProperty('embedDetailContent', embedDetailContent);
  this.updateDetailContent();
};

scout.Outline.prototype._onDetailContentDestroy = function(event) {
  this.setDetailContent(null);
  this.updateDetailMenus();
};

scout.Outline.prototype.setDetailContent = function(content) {
  if (this.detailContent === content) {
    return;
  }
  if (this.rendered) {
    this._removeDetailContent();
  }
  if (this.detailContent) {
    this.detailContent.off('destroy', this._detailContentDestroyHandler);
  }
  this._setProperty('detailContent', content);
  if (content) {
    content.on('destroy', this._detailContentDestroyHandler);
  }
  if (this.rendered) {
    this._renderDetailContent();
  }
  this.invalidateLayoutTree();
};

scout.Outline.prototype.updateDetailContent = function() {
  if (!this.embedDetailContent) {
    this.setDetailContent(null);
    this.setDetailMenus([]);
    return;
  }

  this.setDetailMenuBarVisible(false);
  this.setNodeMenuBarVisible(false);
  this.setDetailContent(this._computeDetailContent());
  this.updateDetailMenus();

  // Layout immediate to prevent 'laggy' form visualization,
  // but not initially while desktop gets rendered because it will be done at the end anyway
  if (this.rendered) {
    this.validateLayoutTree();
  }
};

scout.Outline.prototype._computeDetailContent = function() {
  var selectedPage = this.selectedNode();
  if (!selectedPage) {
    // Detail content is shown for the selected node only
    return null;
  }

  // if there is a detail form, use this
  if (selectedPage.detailForm && selectedPage.detailFormVisible && selectedPage.detailFormVisibleByUi) {
    return selectedPage.detailForm;
    // otherwise show the content of the table row
    // but never if parent is a node page -> the table contains only one column with no essential information
  } else if (selectedPage.row && selectedPage.parentNode.nodeType === scout.Page.NodeType.TABLE) {
    return scout.create('TableRowDetail', {
      parent: this,
      table: selectedPage.parentNode.detailTable,
      row: selectedPage.row
    });
  }
  return null;
};

/**
 * Updates node and detail menubar.
 * Node menubar: Contains the table controls and right aligned menus.
 * Detail menubar: Contains the other menus.
 *
 * The menu items are gathered from various sources:
 * If the selected page has a detailForm, the menus are taken from there. Otherwise the detail table and the parent detail table provide the menus.
 * The detail table contributes the empty space menus and the parent detail the the single selection menus.
 *
 * The menus of the outline itself are not displayed. In fact the server won't deliver any.
 * One reason is that no menus are displayed in regular mode, so when switching to compact mode no menus would be available.
 * Another reason is that it would flicker because the menus are sent anew from the server every time a node gets selected because the menus are added to the outline and not to the node and are therefore not cached.
 */
scout.Outline.prototype.updateDetailMenus = function() {
  if (!this.embedDetailContent) {
    return;
  }
  var selectedPages = this.selectedNodes,
    selectedPage = selectedPages[0],
    menuItems = [],
    tableControls = [],
    nodeMenus = [],
    detailTable,
    detailMenus = [];

  if (this.detailContent && this.detailContent instanceof scout.Form) {
    // get menus from detail form
    var rootGroupBox = this.detailContent.rootGroupBox;
    menuItems = rootGroupBox.processMenus.concat(rootGroupBox.menus);
    rootGroupBox.setMenuBarVisible(false);
    this._attachDetailMenusListener(rootGroupBox);
  } else if (selectedPage) {
    // get empty space menus and table controls from detail table
    if (selectedPage.detailTable) {
      detailTable = selectedPage.detailTable;
      menuItems = scout.menus.filter(detailTable.menus, ['Table.EmptySpace'], false, true);
      tableControls = detailTable.tableControls;
      this._attachDetailMenusListener(detailTable);
    }
    // get single selection menus from parent detail table
    var parentPage = selectedPage.parentNode;
    if (parentPage && parentPage.detailTable) {
      detailTable = parentPage.detailTable;
      menuItems = menuItems.concat(scout.menus.filter(detailTable.menus, ['Table.SingleSelection'], false, true));
      this._attachDetailMenusListener(detailTable);
    }
  }

  // Add table controls to nodeMenus
  tableControls.forEach(function(tableControl) {
    var menu = scout.create('TableControlAdapterMenu',
      scout.TableControlAdapterMenu.adaptTableControlProperties(tableControl, {
        parent: this,
        tableControl: tableControl,
        horizontalAlignment: 1
      }));
    nodeMenus.push(menu);
  }, this);

  // Add right aligned menus to node menus, other to detail menus
  menuItems.forEach(function(menuItem) {
    if (menuItem.horizontalAlignment === 1) {
      nodeMenus.push(menuItem);
    } else {
      detailMenus.push(menuItem);
    }
  }, this);

  this.setNodeMenus(nodeMenus);
  this.setDetailMenus(detailMenus);
};

/**
 * Attaches a listener to the given menu container (which is the detail table or the detail table of the parent node)
 * in order to get dynamic menu changes and update the detailMenus on such a change event.
 * The impl. is lazy because it is only used in mobile mode.
 */
scout.Outline.prototype._attachDetailMenusListener = function(menuContainer) {
  if (!this._detailMenusChangeHandler) {
    this._detailMenusChangeHandler = function(event) {
      if (event.propertyName === 'menus' || event.propertyName === 'tableControls') {
        this.updateDetailMenus();
      }
    }.bind(this);
  }
  if (!this._detailMenusDestroyHandler) {
    this._detailMenusDestroyHandler = function() {
      menuContainer.off('propertyChange', this._detailMenusChangeHandler);
    }.bind(this);
  }

  menuContainer.off('propertyChange', this._detailMenusChangeHandler);
  menuContainer.on('propertyChange', this._detailMenusChangeHandler);
  menuContainer.off('destroy', this._detailMenusDestroyHandler);
  menuContainer.one('destroy', this._detailMenusDestroyHandler);

  if (!this._detailMenusNodesSelectedHandler) {
    // This nodes selection listener removes the property change listeners from the old menu containers (detail content) whenever a node gets selected
    // updateDetailMenus() is called afterwards and attaches the property change listeners to the new detail content
    // This guarantees that no events are fired for non selected nodes
    this._detailMenusNodesSelectedHandler = {
      outline: this,
      menuContainers: [],
      addMenuContainer: function(container) {
        if (this.menuContainers.indexOf(container) > -1) {
          return;
        }
        this.menuContainers.push(container);
      },
      func: function(event) {
        if (event.type !== 'nodesSelected') {
          return;
        }
        this.menuContainers.forEach(function(container) {
          container.off('propertyChange', this.outline._detailMenusChangeHandler);
          container.off('destroy', this.outline._detailMenusDestroyHandler);
        }, this);
        this.menuContainers = [];
      }
    };
    this.addListener(this._detailMenusNodesSelectedHandler);
  }
  this._detailMenusNodesSelectedHandler.addMenuContainer(menuContainer);
};

scout.Outline.prototype.setDetailMenus = function(detailMenus) {
  this.detailMenuBar.setMenuItems(detailMenus);
  this.setDetailMenuBarVisible(this.detailMenuBar.menuItems.length > 0);
};

scout.Outline.prototype._renderDetailMenuBarVisible = function() {
  if (this.detailMenuBarVisible) {
    this._renderDetailMenuBar();
  } else {
    this._removeDetailMenuBar();
  }
};

scout.Outline.prototype._renderDetailMenuBar = function() {
  if (this.detailMenuBar.rendered) {
    return;
  }
  var node = this.selectedNode();
  if (!node || !node.rendered) {
    return;
  }

  this.detailMenuBar.render(node.$node);
  this.detailMenuBar.$container.addClass('detail-menubar');
  if (this.detailContent && this.detailContent.rendered) {
    // move before content (e.g. form)
    this.detailMenuBar.$container.insertBefore(this.detailContent.$container);
  }
  this._ensurePageLayout(node);
  this.invalidateLayoutTree();
};

scout.Outline.prototype._removeDetailMenuBar = function() {
  if (!this.detailMenuBar.rendered) {
    return;
  }
  this.detailMenuBar.remove();
  this.invalidateLayoutTree();
};

scout.Outline.prototype.setDetailMenuBarVisible = function(visible) {
  this.setProperty('detailMenuBarVisible', visible);
};

scout.Outline.prototype.setNodeMenus = function(nodeMenus) {
  this.nodeMenuBar.setMenuItems(nodeMenus);
  this.setNodeMenuBarVisible(this.nodeMenuBar.menuItems.length > 0);
};

scout.Outline.prototype._renderNodeMenuBarVisible = function() {
  if (this.nodeMenuBarVisible) {
    this._renderNodeMenuBar();
  } else {
    this._removeNodeMenuBar();
  }
};

scout.Outline.prototype._renderNodeMenuBar = function() {
  if (this.nodeMenuBar.rendered) {
    return;
  }
  var node = this.selectedNode();
  if (!node || !node.rendered) {
    return;
  }

  var $text = node.$text;
  this.nodeMenuBar.render(node.$node);
  this.nodeMenuBar.$container.addClass('node-menubar');
  this.nodeMenuBar.$container.insertAfter($text);
  this.invalidateLayoutTree();
};

scout.Outline.prototype._removeNodeMenuBar = function() {
  if (!this.nodeMenuBar.rendered) {
    return;
  }
  this.nodeMenuBar.remove();
  this.invalidateLayoutTree();
};

scout.Outline.prototype.setNodeMenuBarVisible = function(visible) {
  this.setProperty('nodeMenuBarVisible', visible);
};

scout.Outline.prototype._glassPaneTargets = function() {
  var desktop = this.session.desktop;
  var elements = [];
  if (desktop.navigation) {
    elements.push(desktop.navigation.$body);
  }
  if (desktop.bench && desktop.bench.outlineContent) {
    scout.arrays.pushAll(elements, desktop.bench.outlineContent.glassPaneTargets());
  }
  return elements;
};

/**
 * === Method required for objects that act as 'displayParent' ===
 *
 * Returns true if this outline is active and not in background.
 */
scout.Outline.prototype.inFront = function() {
  return this.session.desktop.outline === this && !this.inBackground;
};

/**
 * Called if outline acts as display parent.<p>
 * Returns true if outline is active, even if it is not rendered (e.g. when navigation is invisible)
 */
scout.Outline.prototype.acceptDialog = function(dialog) {
  return this.session.desktop.outline === this;
};

/**
 * Called if outline acts as display parent.<p>
 * Returns true if outline is active, even if it is not rendered (e.g. when navigation is invisible)
 */
scout.Outline.prototype.acceptView = function(view) {
  return this.session.desktop.outline === this;
};

// see Java: AbstractOutline#makeActivePageToContextPage
scout.Outline.prototype.activateCurrentPage = function() {
  var activePage = this.activePage();
  if (activePage) {
    activePage.activate();
  }
};

scout.Outline.prototype.activePage = function() {
  return this.selectedNode();
};

scout.Outline.prototype._setViews = function(views) {
  if (views) {
    views.forEach(function(view) {
      view.setDisplayParent(this);
    }.bind(this));
  }
  this._setProperty('views', views);
};

/**
 * @override Tree.js (don't call parent)
 */
scout.Outline.prototype._setMenus = function(menus) {
  var oldMenus = this.menus;
  this.updateKeyStrokes(menus, oldMenus);
  this._setProperty('menus', menus);
  if (this.titleMenuBar) { // _setMenus is called by parent class Tree.js, at this time titleMenuBar is not yet initialized
    var menuItems = scout.menus.filter(this.menus, ['Tree.Header']);
    this.titleMenuBar.setMenuItems(menuItems);
  }
};

scout.Outline.prototype._triggerPageChanged = function(page) {
  this.trigger('pageChanged', {
    page: page
  });
};

/**
 * @override Tree.js
 */
scout.Outline.prototype._nodesSelectedInternal = function() {
  var activePage = this.activePage();
  // This block here is similar to what's done in Java's DefaultPageChangeStrategy
  if (activePage) {
    activePage.activate();
    activePage.ensureLoadChildren().done(
      this._onLoadChildrenDone.bind(this, activePage));
  }
};

scout.Outline.prototype._onLoadChildrenDone = function(activePage) {
  if (activePage) {
    this._initDetailTableAndForm(activePage);
  }
};

scout.Outline.prototype.pageChanged = function(page) {
  if (page) {
    this._initDetailTableAndForm(page);
  }

  var selectedPage = this.selectedNode();
  if (!page && !selectedPage || page === selectedPage) {
    this.updateDetailContent();
  }

  this._triggerPageChanged(page);
};

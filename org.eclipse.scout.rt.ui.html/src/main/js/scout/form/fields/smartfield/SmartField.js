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
// FIXME awe: (smart-field) Do not open popup when Ctrl or Alt key is pressed (e.g. Ctrl + 1)

/**
 * Three smart-field modes:
 *
 * [default] when no flag is set, used for Desktop applications
 *     smart-field opens a popup for proposal-chooser when user
 *     clicks into input-field
 * [touch] smart-field is only a DIV that shows the display-text
 *     when user clicks on the DIV it opens a popup that has an
 *     embedded smart-field and a proposal-chooser.
 * [embedded] used in the popup opened by the touch smart-field.
 *     this type of smart-field does not react on focus / blur
 *     events.
 */
scout.SmartField = function() {
  scout.SmartField.parent.call(this);

  this.DEBOUNCE_DELAY = 200;

  this._addAdapterProperties(['proposalChooser']);
  this.options;
  /**
   * This property is used to prevent unnecessary requests to the server.
   */
  this._oldDisplayText;
  this._popup;
  this._requestedProposal = false;
  /**
   * This property is used to prevent multiple acceptProposal request to the server (blur, aboutToBlur, acceptInput from Action).
   */
  this._acceptedInput = false;
  this._tabPrevented = null;
  this._pendingProposalTyped = null;
  this._navigating = false;
};
scout.inherits(scout.SmartField, scout.ValueField);

/**
 * @override Widget.js
 */
scout.SmartField.prototype._createKeyStrokeContext = function() {
  return new scout.InputFieldKeyStrokeContext();
};

/**
 * @override FormField.js
 */
scout.SmartField.prototype._init = function(model) {
  scout.SmartField.parent.prototype._init.call(this, model);
  scout.fields.initTouch(this, model);
  this._popup = model.popup;
};

scout.SmartField.prototype.addPopup = function() {
  if (!this._popup) {
    var popupType = this.touch ? 'SmartFieldTouchPopup' : 'SmartFieldPopup';
    this._popup = scout.create(popupType, {
      parent: this,
      $anchor: this.$field,
      boundToAnchor: !this.touch,
      closeOnAnchorMousedown: false,
      field: this
    });
  }
};

scout.SmartField.prototype._render = function($parent) {
  var cssClass = this.proposal ? 'proposal-field' : 'smart-field';
  this.addContainer($parent, cssClass, new scout.SmartFieldLayout(this));
  this.addLabel();

  var $field = scout.fields.makeInputOrDiv(this)
    .click(this._onClick.bind(this));
  if (!this.touch) {
    $field
      .blur(this._onFieldBlur.bind(this))
      .focus(this._onFocus.bind(this))
      .keyup(this._onKeyUp.bind(this))
      .keydown(this._onKeyDown.bind(this));
  }
  this.addField($field);

  if (!this.embedded) {
    this.addMandatoryIndicator();
  }
  this.addIcon();
  this.addStatus();
  this.addPopup();
};

scout.SmartField.prototype._remove = function() {
  scout.SmartField.parent.prototype._remove.call(this);
  // popup may not be reused because $anchor would point to a removed field
  // Don't set to null in case of embedded mode to make sure not another popup gets created by the field itself when touch popup get rendered
  if (this._popup && !this.embedded) {
    this._popup = null;
  }
};

/**
 * Method invoked if being rendered within a cell-editor (mode='scout.FormField.MODE_CELLEDITOR'), and once the editor finished its rendering.
 */
scout.SmartField.prototype.onCellEditorRendered = function(options) {
  if (options.openFieldPopup) {
    this._onClick();
  }
};

scout.SmartField.prototype._renderProperties = function() {
  scout.SmartField.parent.prototype._renderProperties.call(this);
  this._renderProposalChooser();
};

scout.SmartField.prototype._syncDisplayText = function(displayText) {
  this._oldDisplayText = displayText;
  this.displayText = displayText;
};

/**
 * @override ValueField.js
 */
scout.SmartField.prototype._renderDisplayText = function() {
  scout.fields.valOrText(this, this.$field, this.displayText);
};

scout.SmartField.prototype._readDisplayText = function() {
  // in case of touch mode a 'div' is rendered and not an 'input' -> use text not val
  return scout.fields.valOrText(this, this.$field);
};

/**
 * Sync method is required because when proposal-chooser has never been rendered and the search-string
 * does not return any proposals in a proposal field, neither _renderProposalChooser nor _removeProposalChooser
 * is called and thus the _requestedProposal flag would never be resetted.
 */
scout.SmartField.prototype._syncProposalChooser = function(proposalChooser) {
  $.log.debug('(SmartField#_syncProposalChooser) set _requestedProposal to false');
  this._requestedProposal = false;
  if (this.embedded) {
    // Never hold the proposal chooser in embedded mode, original smart field takes care of it
    // This makes sure proposal chooser does not get rendered twice.
    // Prevent rendering as well, original smart field will render it into the popup
    return false;
  }
  this.proposalChooser = proposalChooser;
};

/**
 * When popup is not rendered at this point, we render the popup.
 */
scout.SmartField.prototype._renderProposalChooser = function() {
  $.log.debug('(SmartField#_renderProposalChooser) proposalChooser=' + this.proposalChooser + ' touch=' + this.touch);
  if (!this.proposalChooser) {
    return;
  }
  this._renderPopup();
  this._popup._renderProposalChooser(this.proposalChooser);
};

/**
 * This method is called after a valid option has been selected in the proposal chooser.
 */
scout.SmartField.prototype._removeProposalChooser = function() {
  $.log.trace('(SmartField#_removeProposalChooser) proposalChooser=' + this.proposalChooser);
  this._closeProposal(false);
};

scout.SmartField.prototype._isNavigationKey = function(e) {
  return e.which === scout.keys.PAGE_UP ||
    e.which === scout.keys.PAGE_DOWN ||
    e.which === scout.keys.UP ||
    e.which === scout.keys.DOWN;
};

scout.SmartField.prototype._isFunctionKey = function(e) {
  return e.which >= scout.keys.F1 && e.which < scout.keys.F12;
};

scout.SmartField.prototype._onClick = function(event) {
  if (scout.fields.handleOnClick(this)) {
    this._openProposal(true);
  }
};

scout.SmartField.prototype._onIconClick = function(event) {
  if (scout.fields.handleOnClick(this)) {
    scout.SmartField.parent.prototype._onIconClick.call(this, event);
    this._openProposal(true);
  }
};

scout.SmartField.prototype._isPreventDefaultTabHandling = function() {
  var doPrevent = !!this.proposalChooser;
  $.log.trace('(SmartField#_isPreventDefaultTabHandling) must prevent default when TAB was pressed = ' + doPrevent);
  return doPrevent;
};

// navigate in options
scout.SmartField.prototype._onKeyDown = function(e) {
  if (e.which === scout.keys.ESCAPE) {
    if (this._popup.rendered) {
      e.stopPropagation();
    }
    this._closeProposal();
    this._navigating = false;
    return;
  }

  // We must prevent default focus handling
  if (e.which === scout.keys.TAB) {
    if (this._isPreventDefaultTabHandling()) {
      e.preventDefault();
      this._tabPrevented = {
        directionBack: e.shiftKey
      };
      this._acceptProposal();
      this._navigating = false;
      return;
    }
  }

  if (e.which === scout.keys.ENTER) {
    if (this._popup.rendered) {
      e.stopPropagation();
    }
    this._acceptProposal();
    this._navigating = false;
    return;
  }

  if (this._isNavigationKey(e)) {
    this._navigating = true;
    if (this.proposalChooser) {
      this._delegateToProposalChooser(e);
    } else {
      // Since this is the keyDown handler we cannot access the typed text here
      // But when the user presses the down arrow, we can open the proposal
      // chooser immediately. Also we can start a search with text that was already
      // in the text field.
      this._openProposal(true);
    }
  } else {
    this._navigating = false;
  }
};

/**
 * Before we delegate to the proposal chooser, we must make sure that no proposal-typed
 * events are pending (debounce). Otherwise the proposal chooser event is executed _before_
 * the proposal-typed event, which would destroy the selection in the proposal chooser,
 * since the proposal chooser is reloaded, when the search-text changes.
 */
scout.SmartField.prototype._delegateToProposalChooser = function(event) {
  if (this._pendingProposalTyped) {
    // execute pending proposal typed event immediately
    this._pendingProposalTyped.func();
    this._clearPendingProposalTyped();
  }
  this.proposalChooser.delegateEvent(event);
};

scout.SmartField.prototype._onKeyUp = function(e) {

  // Escape
  if (e.which === scout.keys.ESCAPE) {
    e.stopPropagation();
    return;
  }

  // Enter
  if (e.which === scout.keys.ENTER) {
    e.stopPropagation();
    return;
  }

  // Pop-ups shouldn't open when one of the following keys is pressed
  if (e.which === scout.keys.TAB ||
    e.which === scout.keys.SHIFT ||
    e.which === scout.keys.HOME ||
    e.which === scout.keys.END ||
    e.which === scout.keys.LEFT ||
    e.which === scout.keys.RIGHT ||
    this._isNavigationKey(e) ||
    this._isFunctionKey(e)) {
    return;
  }

  // The typed character is not available until the keyUp event happens
  // That's why we must deal with that event here (and not in keyDown)
  // We don't use _displayText() here because we always want the text the
  // user has typed.
  if (this._popup.rendered) {
    this._proposalTyped();
  } else {
    this._openProposal(false);
  }
};

scout.SmartField.prototype._onFocus = function(e) {
  this._oldDisplayText = this._readDisplayText();
  this._acceptedInput = false;
};

scout.SmartField.prototype._proposalTyped = function() {
  var displayText = this._readDisplayText();
  $.log.trace('(SmartField#_proposalTyped) displayText=' + displayText + ' currentDisplayText=' + this.displayText);
  if (displayText === this.displayText) {
    return;
  }
  this.displayText = displayText;

  // debounce send
  var id, func;
  this._clearPendingProposalTyped();

  func = function() {
    $.log.debug('(SmartField#_proposalTyped) send displayText=' + displayText);
    this._send('proposalTyped', {
      displayText: displayText
    });
  }.bind(this);
  id = setTimeout(func, this.DEBOUNCE_DELAY);
  this._pendingProposalTyped = {
    func: func,
    id: id
  };
};

/**
 * Returns the bounds of the text-input element. Subclasses may override this method when their
 * text-field is not === this.$field.
 */
scout.SmartField.prototype._fieldBounds = function() {
  return scout.graphics.offsetBounds(this.$field);
};

scout.SmartField.prototype._onFieldBlur = function() {
  // omit super call
  $.log.debug('(SmartField#_onFieldBlur) tabPrevented=' + this._tabPrevented ? 'true' : 'false');
  this._requestedProposal = false;

  if (this.embedded) {
    // Do not accept input while popup is open
    // Done button of ios virtual keyboard triggers blur -> don't close the popup when pressing done, popup is closed when pressing enter.
    return;
  }

  // When we have prevented TAB handling in keyDown handler, we have already sent an acceptProposal event.
  // At this time the proposalChooser was open, and thus the proposalChooserOpen flag was set to true
  // which means the Java-client uses the selected row from the proposalChooser and _not_ the display text.
  // After the request, when we set the focus with _focusNextTabbable(), we must _not_ send acceptProposal
  // again. It is not only unnecessary but would even cause errors, because at this time the proposalChooser
  // is closed and for the Java-client the request would look like, it should perform a lookup after the
  // user has typed something into the SmartField.
  if (this._tabPrevented) {
    this._tabPrevented = null;
  } else {
    this.acceptInput();
  }
};

scout.SmartField.prototype._clearPendingProposalTyped = function() {
  if (this._pendingProposalTyped) {
    clearTimeout(this._pendingProposalTyped.id);
  }
  this._pendingProposalTyped = null;
};

/**
 * This method is called when the user presses the TAB or ENTER key in the UI, or when _onFieldBlur()
 * or acceptInput(). In case the field is a proposal-field we must send the current displayText
 * to the server, even when the popup is not opened (this happens when the user types something which
 * is not in the list of proposals). We must accept the user defined text in that case.
 */
scout.SmartField.prototype._acceptProposal = function(forceClose) {
  // must clear pending "proposalTyped" events because nothing good happens
  // when proposalTyped arrives _after_ an "acceptProposal" event.
  this._clearPendingProposalTyped();

  forceClose = scout.nvl(forceClose, false);
  // embedded smartfield does not hold a reference to the chooser, but if it is shown touch popup is open and therefore the chooser as well
  var proposalChooserOpen = !!this.proposalChooser || this.embedded,
    displayText = this._readDisplayText();

  $.log.debug('(SmartField#_acceptProposal) displayText=' + displayText + ' proposalChooserOpen=' + proposalChooserOpen + ' forceClose=' + forceClose);
  if (proposalChooserOpen) {
    // Always send accept proposal, when proposal chooser is opened,
    // Because user wants to choose the selected proposal from the
    // proposal chooser by pressing TAB or ENTER.
    // The Java client will use the selected row as value when it
    // receives the acceptProposal event in that case.
    //
    // We must also handle the case that the user deletes the search
    // text immediately followed by a TAB key press. In that case the
    // UI Server has not enough information to find out what happened
    // and would accept a proposal, since on the model there's still
    // a selected proposal (ticket #168652).
    var textDeleted = scout.strings.empty(displayText) && scout.strings.hasText(this._oldDisplayText);
    if (textDeleted && !this._navigating) {
      this._sendDeleteProposal(displayText);
    } else {
      this._triggerAcceptProposal(displayText);
      this._sendAcceptProposal(displayText, true, forceClose);
    }

    if (this.embedded) {
      // Always close popup when user presses 'Enter' on virtual keyboard if touch popup is open
      this._closeProposal();
    }
  } else {
    // When proposal chooser is closed, only send accept proposal
    // when search text has changed. Prevents unnecessary requests
    // to the server when the user tabs over the smart-field.
    if (displayText === this._oldDisplayText) {
      return;
    }
    this._triggerAcceptProposal(displayText);
    this._sendAcceptProposal(displayText, false, forceClose);
  }

  this.session.listen().done(function() {
    $.log.debug('(SmartField) request done proposalChooser=' + this.proposalChooser);
    if (this._tabPrevented && !this.proposalChooser) {
      this._focusNextTabbable();
    }
  }.bind(this));
};

scout.SmartField.prototype._sendDeleteProposal = function(displayText) {
  this._syncDisplayText(displayText);
  this._send('deleteProposal');
};

scout.SmartField.prototype._triggerAcceptProposal = function(displayText) {
  this.trigger('acceptProposal', {
    displayText: displayText
  });
};

scout.SmartField.prototype._sendAcceptProposal = function(displayText, chooser, forceClose) {
  this._syncDisplayText(displayText);
  this._send('acceptProposal', {
    displayText: displayText,
    chooser: chooser,
    forceClose: forceClose
  });
};

// FIXME awe, dwi: (focus) check if we can find next tabbable in the current focus-context (FocusManager)
scout.SmartField.prototype._focusNextTabbable = function() {
  var $tabElements = this.entryPoint().find(':tabbable');
  var direction = this._tabPrevented.directionBack ? -1 : 1;
  var fieldIndex = $tabElements.index(this.$field);
  var nextIndex = fieldIndex + direction;
  if (nextIndex < 0) {
    nextIndex = $tabElements.length - 1;
  } else if (nextIndex >= $tabElements.length) {
    nextIndex = 0;
  }
  $.log.debug('SmartField tab-index=' + fieldIndex + ' next tab-index=' + nextIndex);
  $tabElements.eq(nextIndex).focus();
};

scout.SmartField.prototype._closeProposal = function(notifyServer) {
  if (this._popup.rendered) {
    if (scout.nvl(notifyServer, true)) {
      this._sendCancelProposal();
    }
    this._popup.close();
  }
};

scout.SmartField.prototype._sendCancelProposal = function() {
  this._send('cancelProposal');
};

/**
 * This method opens a popup before we contact the server to load proposals. This means
 * at this point we cannot know what size the popup should have. We have to set a fixed
 * size and resize the popup later when proposals are available.
 *
 * When the smartfield is valid, we want to perform a "browse all" search (=empty string),
 * when the field is invalid, we want to perform a search with the current display-text.
 *
 * Other as in _proposalTyped we always open the proposal, even when the display text
 * has not changed.
 */
scout.SmartField.prototype._openProposal = function(browseAll) {
  var displayText = this._readDisplayText(),
    selectCurrentValue = browseAll;
  this.displayText = displayText;
  if (this.errorStatus) {
    selectCurrentValue = false;
  }

  if (this._requestedProposal) {
    $.log.trace('(SmartField#_openProposal) already requested proposal -> do nothing');
  } else {
    this._requestedProposal = true;
    $.log.debug('(SmartField#_openProposal) send openProposal. displayText=' + displayText + ' selectCurrentValue=' + selectCurrentValue);
    this._send('openProposal', {
      displayText: displayText,
      selectCurrentValue: selectCurrentValue,
      browseAll: browseAll
    });
  }
};

scout.SmartField.prototype._renderPopup = function() {
  if (this._popup.rendered) {
    return;
  }
  this._popup.open();
  if (this.touch) {
    this._acceptedInput = false;
    // Error message is shown on touch popup as well, don't show twice
    this._hideStatusMessage();
  }
};

/**
 * @override ValueField.js
 */
scout.SmartField.prototype.acceptInput = function(whileTyping) {
  if (this.mode !== scout.FormField.MODE_CELLEDITOR && !this._acceptedInput) {
    this._acceptProposal(true);
    this._acceptedInput = true;
  }
};

/**
 * @override ValueField.js
 */
scout.SmartField.prototype.aboutToBlurByMouseDown = function(target) {
  var eventOnField = this.$field.isOrHas(target);
  var eventOnPopup = this._popup.rendered && this._popup.$container.isOrHas(target);

  if (!eventOnField && !eventOnPopup) {
    this.acceptInput(); // event outside this field.
  }
};

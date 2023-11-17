/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */
import {Dimension, events, graphics, Point} from '@eclipse-scout/core';
import $ from 'jquery';

/**
 * Minimal distance in pixels for a "mouse move" action to take effect.
 * Prevents "mini jumps" when simply clicking on an element.
 */
const MOUSE_MOVE_THRESHOLD = 7;

// TODO CGU cleanup, remove all not essential
// TODO CGU use Rectangle and Point, use bounds instead of offset with with and height
export class MoveSupport {
  protected _callback: any;
  protected _moveData: any;
  protected _animationDurationFactor: number;
  protected _mouseMoveHandler: (event: JQuery.MouseDownEvent) => void;
  protected _mouseUpHandler: (event: JQuery.MouseUpEvent) => void;

  /**
   * @param callback - function to be called when the move has ended. Argument: list of elements in new order.
   */
  constructor(callback) {
    this._callback = callback;

    // Temporary data structure to store data while mouse actions are handled
    this._moveData = null;

    this._animationDurationFactor = 1;

    this._mouseMoveHandler = this._onMouseMove.bind(this);
    this._mouseUpHandler = this._onMouseUp.bind(this);
  }

  /**
   * @param {Event} event
   * @param {Widget[]} elements
   * @param {Widget} draggedElement
   */
  startMove(event, elements, draggedElement) {
    if (this._moveData) {
      // Do nothing, when dragging is already in progress. This can happen when the user leaves
      // the browser window (e.g. using Alt-Tab) while holding the mouse button pressed and
      // then returns and presses the mouse button again.
      return;
    }

    if (!event || !elements || !elements.length || !draggedElement || !draggedElement.$container) {
      return;
    }
    let $window = draggedElement.$container.window();
    let $elements = draggedElement.$container.parent();

    // -----

    events.fixTouchEvent(event);

    // Start move
    this._moveData = {};
    this._moveData.session = draggedElement.session;
    this._moveData.$window = $window;
    this._moveData.$container = $elements;
    this._moveData.containerOffset = $elements.offset();
    this._moveData.containerSize = graphics.size($elements, {
      includeMargin: true
    });
    this._moveData.containerOrigStyle = $elements.attr('style');

    this._moveData.elements = elements;
    this._moveData.newElements = [...elements];
    this._moveData.elementInfos = elements
      .filter(element => !!element.$container)
      .map((element, index) => {
        // Collect various information about each element. This allows us to retrieve positions later on without
        // needing to measure them each time the mouse cursor moves. We can also skip null checks for $element.
        //
        // - offset   = absolute position (relative to the window)
        // - top/left = relative position (relative to the container)
        //
        let $element = element.$container;
        let offset = $element.offset();
        let top = offset.top - this._moveData.containerOffset.top;
        let left = offset.left - this._moveData.containerOffset.left;
        // TODO CGU use _updateElementInfo
        let info = {
          element: element,
          $element: $element,
          offset: offset,
          top: top,
          left: left,
          height: $element.cssHeight(),
          width: $element.cssWidth(),
          origStyle: $element.attr('style')
        };
        if (element === draggedElement) {
          this._moveData.draggedElementInfo = info;
          this._moveData.$draggedElement = $element; // convenience (short for draggedElementInfo.$element)
        }
        return info;
      });

    this._moveData.startCursorPosition = new Point(
      event.pageX - this._moveData.containerOffset.left,
      event.pageY - this._moveData.containerOffset.top
    );
    this._moveData.currentCursorPosition = this._moveData.startCursorPosition;
    // Compute distances from the cursor to the edges of the chart section
    this._moveData.cursorDistanceTop = event.pageY - this._moveData.draggedElementInfo.offset.top;
    this._moveData.cursorDistanceBottom = this._moveData.draggedElementInfo.offset.top + this._moveData.draggedElementInfo.height - event.pageY;

    this._moveData.top = 0;
    this._moveData.left = 0;
    if (this._moveData.elementInfos.length) {
      this._moveData.top = this._moveData.elementInfos[0].top;
      this._moveData.left = this._moveData.elementInfos[0].left;
    }
    this._moveData.vgap = 0;
    if (this._moveData.elementInfos.length > 1) {
      // Use margin between first and second chart section as vgap
      let t1 = this._moveData.elementInfos[0];
      let t2 = this._moveData.elementInfos[1];
      this._moveData.vgap = t2.top - t1.height - t1.top;
    }

    // -----

    this._moveData.$window
      .off('mousemove touchmove', this._mouseMoveHandler)
      .off('mouseup touchend touchcancel', this._mouseUpHandler)
      .on('mousemove touchmove', this._mouseMoveHandler)
      .on('mouseup touchend touchcancel', this._mouseUpHandler);
    $('iframe').addClass('dragging-in-progress');

    // Prevent scrolling on touch devices (like "touch-action: none" but with better browser support).
    // Theoretically, unwanted scrolling can be prevented by adding the CSS rule "touch-action: none"
    // to the element. Unfortunately, not all devices support this (e.g. Apple Safari on iOS).
    // Therefore, we always suppress the scrolling in JS. Because this also suppresses the 'click'
    // event, click actions have to be triggered manually in the 'mouseup' handler.
    event.preventDefault();
  }

  protected _updateElementInfo(elementInfo) {
    let $element = elementInfo.$element;
    let offset = $element.offset();
    let top = offset.top - this._moveData.containerOffset.top;
    let left = offset.left - this._moveData.containerOffset.left;
    $.extend(elementInfo, {
      offset: offset,
      top: top,
      left: left,
      height: $element.cssHeight(),
      width: $element.cssWidth()
    });
  }

  protected _updateElementInfos() {
    this._moveData.elementInfos.forEach(info => this._updateElementInfo(info));
  }

  cancelMove() {
    if (!this._moveData) {
      return;
    }

    this._moveData.$window
      .off('mousemove touchmove', this._mouseMoveHandler)
      .off('mouseup touchend touchcancel', this._mouseUpHandler);
    $('iframe').removeClass('dragging-in-progress');

    this._restoreStyles();
    this._moveData = null;
  }

  _restoreStyles() {
    // Remove clone
    this._moveData.$clone && this._moveData.$clone.remove();

    // Restore styles
    this._moveData.$draggedElement.removeClass('dragged');
    // this._moveData.elementInfos.forEach(info => info.$element.attrOrRemove('style', info.origStyle));
    this._moveData.$container.attrOrRemove('style', this._moveData.containerOrigStyle);
    this._moveData.$container.removeClass('dragging-element');
  }

  _onMouseMove(event) {
    events.fixTouchEvent(event);

    // Adjust relative values if the panel has been scrolled while dragging (e.g. using the mouse wheel)
    let containerOffset = this._moveData.$container.offset();
    if (containerOffset.top !== this._moveData.containerOffset.top) {
      let dy = containerOffset.top - this._moveData.containerOffset.top;
      this._moveData.containerOffset.top += dy;
      if (this._moveData.cloneStartOffset) {
        this._moveData.cloneStartOffset.top += dy;
      }
      this._moveData.elementInfos.forEach(info => {
        info.offset.top += dy;
      });
    }

    // -----

    this._moveData.currentCursorPosition = new Point(
      event.pageX - this._moveData.containerOffset.left,
      event.pageY - this._moveData.containerOffset.top
    );
    let distance = new Point(
      this._moveData.currentCursorPosition.x - this._moveData.startCursorPosition.x,
      this._moveData.currentCursorPosition.y - this._moveData.startCursorPosition.y);

    // Ignore small mouse movements
    if (!this._moveData.moving) {
      if (Math.abs(distance.x) < MOUSE_MOVE_THRESHOLD && Math.abs(distance.y) < MOUSE_MOVE_THRESHOLD) {
        return;
      }
      this._moveData.moving = true;

      // TODO CGU why? margin 0?
      // Change everything to absolute positions
      this._moveData.$container
        .addClass('dragging-element')
        .cssHeight(this._moveData.containerSize.height);

      this._moveData.elementInfos.forEach(info => {
        info.$element
          .css({
            position: 'absolute',
            margin: 0,
            width: info.width,
            height: info.height,
            left: info.left,
            top: info.top
          });
      });
    }

    // -----

    // Create a clone of the dragged chart that is positioned 'fixed', i.e. with document-absolute coordinates
    if (!this._moveData.$clone) {
      this._moveData.cloneStartOffset = this._moveData.$draggedElement.offset();
      this._moveData.cloneSize = new Dimension(this._moveData.$draggedElement.cssWidth(), this._moveData.$draggedElement.cssHeight());
      this._moveData.$clone = this._moveData.$draggedElement.clone()
        .addClass('dragging clone')
        .removeAttr('data-id')
        .css('position', 'fixed')
        .appendTo(this._moveData.session.$entryPoint);
      // Because the clone is added to the $entryPoint (to ensure it is drawn above everything else),
      // the mouse wheel events won't bubble to the container. To make the mouse while work while
      // dragging, we delegate the event manually.
      this._moveData.$clone.on('DOMMouseScroll mousewheel', event => this._moveData.$container.trigger(event));

      // // Clone canvas contents manually
      // let origCanvases = this._moveData.$draggedElement.find('canvas:visible');
      // this._moveData.$clone.find('canvas:visible').each((index, canvas) => {
      //   try {
      //     canvas.getContext('2d').drawImage(origCanvases.get(index), 0, 0);
      //   } catch (err) {
      //     // Drawing on the canvas can throw unexpected errors, for example:
      //     // "DOMException: Failed to execute 'drawImage' on 'CanvasRenderingContext2D':
      //     // The image argument is a canvas element with a width or height of 0."
      //     let log = window && window.console && (window.console.warn || window.console.log);
      //     log && log('Unable to clone canvas. Reason: ', err);
      //   }
      // });

      this._moveData.$cloneShadow = this._moveData.$clone.prependDiv('shadow')
        .animate({
          opacity: 1
        }, {
          duration: 250 * this._animationDurationFactor
        });

      this._moveData.$draggedElement.addClass('dragged'); // Change style of dragged chart
    }
    // Update clone position
    this._moveData.cloneOffset = {
      top: this._moveData.cloneStartOffset.top + distance.y,
      left: this._moveData.cloneStartOffset.left + distance.x
    };
    this._moveData.$clone.css({
      top: this._moveData.cloneOffset.top,
      left: this._moveData.cloneOffset.left
    });

    // Don't change chart order if the clone is outside the container area
    // TODO CGU use use Rectangle.contains
    if (this._moveData.cloneOffset.left + this._moveData.cloneSize.width < this._moveData.containerOffset.left ||
      this._moveData.cloneOffset.top + this._moveData.cloneSize.height < this._moveData.containerOffset.top ||
      this._moveData.cloneOffset.left > this._moveData.containerOffset.left + this._moveData.containerSize.width ||
      this._moveData.cloneOffset.top > this._moveData.containerOffset.top + this._moveData.containerSize.height) {
      return;
    }

    this._handleMove(event); // TODO CGU or just ovverride onMoueMove?

    // -----
    //
    // let currentIndex = this._moveData.elementInfos.indexOf(this._moveData.draggedElementInfo);
    // let moveBeforeIndex = -1;
    // let moveAfterIndex = -1;
    //
    // let cursorY = this._moveData.currentCursorPosition.y;
    // let currentTop = this._moveData.draggedElementInfo.top;
    // let currentBottom = currentTop + this._moveData.draggedElementInfo.height;
    // if (currentIndex >= 0 && cursorY < currentTop) {
    //   // Cursor is above current chart --> check previous charts (backward)
    //   for (let i = currentIndex - 1; i >= 0; i--) {
    //     let info = this._moveData.elementInfos[i];
    //     // Check if the top edge of dragged chart passed the middle of this chart
    //     if (cursorY - this._moveData.cursorDistanceTop < info.top + (info.height * 0.5)) {
    //       moveBeforeIndex = i;
    //     }
    //   }
    // } else if (currentIndex < this._moveData.elementInfos.length && cursorY > currentBottom) {
    //   // Cursor is below current chart --> check next charts (forward)
    //   for (let i = currentIndex + 1; i < this._moveData.elementInfos.length; i++) {
    //     let info = this._moveData.elementInfos[i];
    //     // Check if the bottom edge of dragged chart passed the middle of this chart
    //     if (cursorY + this._moveData.cursorDistanceBottom > info.top + (info.height * 0.5)) {
    //       moveAfterIndex = i;
    //     }
    //   }
    // }
    //
    // let cursorX = this._moveData.currentCursorPosition.x;
    // let currentLeft = this._moveData.draggedElementInfo.left;
    // let currentRight = currentLeft + this._moveData.draggedElementInfo.width;
    // if (currentIndex >= 0 && cursorX < currentLeft) {
    //   // Cursor is left of current element --> check previous elements (backward)
    //   for (let i = currentIndex - 1; i >= 0; i--) {
    //     let info = this._moveData.elementInfos[i];
    //     // Check if the top edge of dragged element passed the middle of this element
    //     if (cursorX - this._moveData.cursorDistanceTop < info.top + (info.height * 0.5)) {
    //       moveBeforeIndex = i;
    //     }
    //   }
    // } else if (currentIndex < this._moveData.elementInfos.length && cursorY > currentBottom) {
    //   // Cursor is below current chart --> check next charts (forward)
    //   for (let i = currentIndex + 1; i < this._moveData.elementInfos.length; i++) {
    //     let info = this._moveData.elementInfos[i];
    //     // Check if the bottom edge of dragged chart passed the middle of this chart
    //     if (cursorY + this._moveData.cursorDistanceBottom > info.top + (info.height * 0.5)) {
    //       moveAfterIndex = i;
    //     }
    //   }
    // }
    //
    //
    // if (moveBeforeIndex < 0 && moveAfterIndex < 0) {
    //   // Nothing to do
    //   return;
    // }
    //
    // if (moveBeforeIndex >= 0) {
    //   // Move current chart *before* another chart
    //   arrays.move(this._moveData.elementInfos, currentIndex, moveBeforeIndex);
    // } else if (moveAfterIndex >= 0) {
    //   // Move current chart *after* another chart
    //   arrays.move(this._moveData.elementInfos, currentIndex, moveAfterIndex);
    // }
    //
    // // Update positions
    // let top = this._moveData.top;
    // let affectedIndexFrom = (moveBeforeIndex >= 0 ? moveBeforeIndex : currentIndex);
    // let affectedIndexTo = (moveAfterIndex >= 0 ? moveAfterIndex : currentIndex);
    // this._moveData.elementInfos.forEach((info, index, arr) => {
    //   if (index >= affectedIndexFrom || index <= affectedIndexTo) {
    //     // Affected chart --> Update target position
    //     info.offset.top = this._moveData.containerOffset.top + top;
    //     info.top = top;
    //     // Animate
    //     info.$element
    //       .stop(true)
    //       .animate({
    //         top: info.top
    //       }, {
    //         duration: 250 * this._animationDurationFactor
    //       });
    //   }
    //   top += info.height + this._moveData.vgap;
    // });
  }

  protected _handleMove(event: JQuery.MouseMoveEvent) {

  }

  _onMouseUp(event) {
    events.fixTouchEvent(event);

    this._moveData.$window
      .off('mousemove touchmove', this._mouseMoveHandler)
      .off('mouseup touchend touchcancel', this._mouseUpHandler);
    $('iframe').removeClass('dragging-in-progress');

    // -----

    // Remove clone (animated)
    let promises = [];
    if (this._moveData.$clone) {
      let targetOffset = this._moveData.draggedElementInfo.offset;
      let targetHeight = this._moveData.draggedElementInfo.height;
      let targetWidth = this._moveData.draggedElementInfo.width;
      // Fade out placeholder ($draggedElement is made visible again in _restoreStyles later)
      // promises.push(this._moveData.$draggedElement
      //   .css('opacity', 1)
      //   .animate({
      //     opacity: 0
      //   }, {
      //     duration: 500 * this._animationDurationFactor
      //   })
      //   .promise());
      // Fade out shadow
      promises.push(this._moveData.$cloneShadow
        .stop(true)
        .animate({
          opacity: 0
        }, {
          duration: 500 * this._animationDurationFactor
        })
        .promise());
      // Move clone to target position
      promises.push(this._moveData.$clone
        .css('pointer-events', 'none')
        .animate({
          top: targetOffset.top,
          left: targetOffset.left,
          width: targetWidth,
          height: targetHeight
        }, {
          easing: 'easeOutQuart',
          duration: 500 * this._animationDurationFactor
        })
        .promise());
    }

    $.promiseAll(promises).then(() => {
      this._restoreStyles();

      // let oldElements = this._moveData.elements;
      // let newElements = oldElements.slice().sort((e1, e2) => {
      //   let pos1 = arrays.findIndex(this._moveData.elementInfos, (info: any) => info.element === e1);
      //   let pos2 = arrays.findIndex(this._moveData.elementInfos, (info: any) => info.element === e2);
      //   return pos1 - pos2;
      // });

      // if (!arrays.equals(oldElements, newElements)) {
      //   this._callback && this._callback(newElements);
      // }

      // TODO CGU origStyle schiebt kachel wieder zurück, wieso bei kohorten nicht?
      // End move
      this._moveData = null;
    });
  }
}

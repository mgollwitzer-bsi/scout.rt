/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {arrays, graphics, GridData, MoveData, MoveSupport, Rectangle, scout, Tile, TileGrid} from '../index';

export class TileGridMoveSupport extends MoveSupport<Tile> {
    declare _moveData: TileMoveData;
  tileGrid: TileGrid;

    constructor(tileGrid: TileGrid) {
        super();
    this.tileGrid = tileGrid;
  }

    protected override _drag(event: JQuery.MouseMoveEvent) {
    if (this._moveData.tileBelowCursor) {
      this._moveData.tileBelowCursor.$container.removeClass('dragover');
    }
    let $tileBelowCursor = this._moveData.$container.elementFromPoint(event.pageX, event.pageY, '.tile');
    let tileBelowCursor = scout.widget($tileBelowCursor);
    if (!(tileBelowCursor instanceof Tile)) {
      this._moveData.tileBelowCursor = null;
      return;
    }
    if (this._moveData.draggedElementInfo.element === tileBelowCursor) {
      this._moveData.tileBelowCursor = null;
      return;
    }
    this._moveData.tileBelowCursor = tileBelowCursor;
    this._moveData.tileBelowCursor.$container.addClass('dragover');
  }

    protected override _dragEnd(event: JQuery.MouseUpEvent): JQuery.Promise<Rectangle> {
    if (!this._moveData.tileBelowCursor) {
        return super._dragEnd(event);
    }
    let tileBelowCursor = this._moveData.tileBelowCursor;
    let newElements = [...this._moveData.elements];
    let draggedTile: Tile = this._moveData.draggedElementInfo.element;
    let newTile: Tile = tileBelowCursor;
    let draggedGridData = new GridData(draggedTile.gridDataHints);
    let newGridData = new GridData(newTile.gridDataHints);
    arrays.swap(newElements, newTile, draggedTile);
    newTile.setGridDataHints(draggedGridData);
    draggedTile.setGridDataHints(newGridData);
    this.tileGrid.setTiles(newElements);
    this._moveData.elements = this.tileGrid.tiles;
    // Update element infos right after layout is done but BEFORE animation starts to get the final position of the tiles
        // FIXME CGU this throws an error if tile is moved from a place holder on the right to another one left of it
    this._moveData.tileBelowCursor.$container.removeClass('dragover');

    let def = $.Deferred();
    // Wait for layout to get correct target dimensions (grid cells may have changed size and position)
    // Cannot use 'when' because the promise would resolve while the bounds animation is already running
    this.tileGrid.one('layoutDone', () => {
      // Dragged tile is now already at the target position
      let targetBounds = graphics.offsetBounds(draggedTile.$container);
        if (targetBounds.dimension().equals(this._moveData.draggedElementInfo.bounds.dimension())) {
        // If size does not change, there is no need to replace the clone
        def.resolve(targetBounds);
        return;
      }

      // If the dragged tile will change its size, we need to create a new clone because the tile content will likely change as well.
      // This guarantees a smooth transition to the new content and no flickering when the clone is removed.
      let bounds = graphics.offsetBounds(this._moveData.$clone);
      this._moveData.$clone.remove();
      this._append$Clone();
      this._moveData.$clone.removeClass('dragged');
      let scale = bounds.width / this._moveData.$clone.width();
      this._moveData.$clone.css({
        'top': bounds.y,
        'left': bounds.x,
        '--dragging-scale': scale,
        '--animation-duration-factor': 0, // Temporarily disable scale transition because clone replacement must not be visible
        'transform-origin': '0 0'
      });

      // Enable transition again to animate the resizing to the target size
      requestAnimationFrame(() => {
        this._moveData.$clone.css('--animation-duration-factor', this._animationDurationFactor);
        def.resolve(targetBounds);
      });
    });
    return def.promise();
  }
}

export interface TileMoveData extends MoveData<Tile> {
    tileBelowCursor: Tile;
}

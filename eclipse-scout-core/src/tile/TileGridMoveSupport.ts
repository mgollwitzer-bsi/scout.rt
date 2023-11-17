/*
 * Copyright (c) 2010, 2023 BSI Business Systems Integration AG
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {arrays, GridData, MoveSupport, scout, Tile, TileGrid} from '../index';

export class TileGridMoveSupport extends MoveSupport {
  tileGrid: TileGrid;

  constructor(callback, tileGrid: TileGrid) {
    super(callback);
    this.tileGrid = tileGrid;
  }

  protected override _handleMove(event: JQuery.MouseMoveEvent) {
    let $tileBelowCursor = this._moveData.$container.elementFromPoint(event.pageX, event.pageY, '.tile');
    let tileBelowCursor = scout.widget($tileBelowCursor);
    if (!(tileBelowCursor instanceof Tile)) {
      return;
    }
    if (tileBelowCursor.$container.hasClass('moving') || this._moveData.draggedElementInfo.element === tileBelowCursor) {
      return;
    }
    let newElements = [...this._moveData.elements];
    let draggedTile: Tile = this._moveData.draggedElementInfo.element;
    let newTile: Tile = tileBelowCursor;
    let draggedGridData = new GridData(draggedTile.gridDataHints);
    let newGridData = new GridData(newTile.gridDataHints);
    arrays.swap(newElements, newTile, draggedTile);
    newTile.setGridDataHints(draggedGridData);
    draggedTile.setGridDataHints(newGridData);
    // TODO CGU get all tiles at new place not just one and move all?
    // TODO CGU current insert logic moves tiles vertically to the bottom

    this.tileGrid.setTiles(newElements);
    this._moveData.elements = this.tileGrid.tiles;
    // Update element infos right after layout is done but BEFORE animation starts to get the final position of the tiles
    this.tileGrid.one('layoutDone', event => this._updateElementInfos());
  }
}

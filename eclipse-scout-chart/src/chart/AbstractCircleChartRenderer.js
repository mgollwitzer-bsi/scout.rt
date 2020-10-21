/*
 * Copyright (c) 2010-2020 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 */
import {AbstractSvgChartRenderer} from '../index';
import $ from 'jquery';

export default class AbstractCircleChartRenderer extends AbstractSvgChartRenderer {

  constructor(chart) {
    super(chart);

    this.animationTriggered = false;
    this.segmentClassForAnimation;
    this.r;
  }

  pathSegment(start, end) {
    let s = start * 2 * Math.PI,
      e = end * 2 * Math.PI,
      pathString = '';

    pathString += 'M' + (this.chartBox.mX() + this.r * Math.sin(s)) + ',' + (this.chartBox.mY() - this.r * Math.cos(s));
    pathString += 'A' + this.r + ', ' + this.r;
    pathString += (end - start < 0.5) ? ' 0 0,1 ' : ' 0 1,1 ';
    pathString += (this.chartBox.mX() + this.r * Math.sin(e)) + ',' + (this.chartBox.mY() - this.r * Math.cos(e));
    pathString += 'L' + this.chartBox.mX() + ',' + this.chartBox.mY() + 'Z';

    return pathString;
  }

  _removeAnimated(afterRemoveFunc) {
    if (this.animationTriggered) {
      return;
    }
    let that = this;
    let tweenOut = function(now, fx) {
      let $this = $(this);
      let start = $this.data('animation-start'),
        end = $this.data('animation-end');
      $this.attr('d', that.pathSegment(start * (1 - fx.pos), end * (1 - fx.pos)));
    };

    this.animationTriggered = true;
    this.$svg.children(this.segmentSelectorForAnimation)
      .animate({
        tabIndex: 0
      }, this._createAnimationObjectWithTabindexRemoval(tweenOut))
      .promise()
      .done(() => {
        this._remove(afterRemoveFunc);
        this.animationTriggered = false;
      });
  }
}
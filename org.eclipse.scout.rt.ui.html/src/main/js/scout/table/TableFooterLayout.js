scout.TableFooterLayout = function(tableFooter) {
  scout.TableFooterLayout.parent.call(this);

  this._tableFooter = tableFooter;
};
scout.inherits(scout.TableFooterLayout, scout.AbstractLayout);

/**
 * @override
 */
scout.TableFooterLayout.prototype.layout = function($container) {
  var contentFits, controlsWidth, infoWidth,
    $controls = this._tableFooter._$controls,
    $info = this._tableFooter._$info,
    $infoItems = $info.find('.table-info-item'),
    containerWidth = scout.graphics.getSize($container).width;

  controlsWidth = scout.graphics.getSize($controls).width;
  infoWidth = scout.graphics.getSize($info).width;

  // Remove width to make sure elements are as width as they want to be
  $infoItems.each(function() {
    var $item = $(this);
    // Do not touch items which are being hidden to make sure they can properly animate width to 0
    if ($item.isVisible() && !$item.data('hiding')) {
      $item.data('oldWidth', $item.outerWidth());
      $item.css('width', 'auto');
    }
  });

  // Always try to use max space first
  if (this._tableFooter._compactStyle) {
    this._tableFooter._compactStyle = false;
    this._tableFooter._renderInfo();
  }
  infoWidth = scout.graphics.getSize($info).width;
  if (controlsWidth + infoWidth <= containerWidth) {
    contentFits = true;
  }

  if (!contentFits) {
    // If elements don't fit, try to minimize table-info
    this._tableFooter._compactStyle = true;
    this._tableFooter._renderInfo();

    infoWidth = scout.graphics.getSize($info).width;
    if (controlsWidth + infoWidth <= containerWidth) {
      contentFits = true;
    }
  }

  // don't animate on the first layouting -> only animate on user interactions  
  var animated = this._tableFooter.htmlComp.layouted;
  this._setInfoItemsSize($infoItems, animated);

  if (this._tableFooter._tableStatusTooltip && this._tableFooter._tableStatusTooltip.rendered) {
    this._tableFooter._tableStatusTooltip.position();
  }
};

scout.TableFooterLayout.prototype._setInfoItemsSize = function($infoItems, animated) {
  $infoItems.each(function() {
    var $item = $(this);
    if ($item.isVisible() && !$item.data('hiding')) {
      // Make sure complete function of already scheduled animation will be executed
      var existingComplete = $item.data('animationComplete');
      if (animated) {
        $item.cssWidthAnimated($item.data('oldWidth'), $item.outerWidth(), {
          complete: existingComplete
        });
        $item.removeData('oldWidth');
      } else {
        $item.cssWidth($item.outerWidth());
      }
    }
  });
};

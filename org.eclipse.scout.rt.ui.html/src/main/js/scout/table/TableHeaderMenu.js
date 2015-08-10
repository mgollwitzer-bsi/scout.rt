// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

// FIXME CRU: implement buttons to show/hide, add/remove columns depending on 'custom' property.
scout.TableHeaderMenu = function(table, $header, x, y, session) {
  var column = $header.data('column'),
    pos = table.columns.indexOf(column);

  this.session = session;
  // label title
  $header.addClass('menu-open');

  // create container
  var $menuHeader = table.$container.appendDiv('table-header-menu')
    .css('left', x).css('top', y + $header.outerHeight());

  $menuHeader.appendDiv('table-header-menu-whiter').width($header[0].offsetWidth - 2);

  this.$headerMenu = $menuHeader;
  this.$header = $header;

  // every user action will close menu
  $(window).on('mousedown.tableheadermenu', onMouseDown);
  $(window).on('keydown.tableheadermenu', removeMenu);

  // create buttons in command for order
  if (table.header.columns.length > 1) {
    var $commandMove = $menuHeader.appendDiv('header-group');
    $commandMove.appendDiv('header-text')
      .data('label', session.text('ui.Move'));

    $commandMove.appendDiv('header-command move-top')
      .data('label', session.text('ui.toBegin'))
      .click(moveTop);
    $commandMove.appendDiv('header-command move-up')
      .data('label', session.text('ui.forward'))
      .click(moveUp);
    $commandMove.appendDiv('header-command move-down')
      .data('label', session.text('ui.backward'))
      .click(moveDown);
    $commandMove.appendDiv('header-command move-bottom')
      .data('label', session.text('ui.toEnd'))
      .click(moveBottom);
  }

  // create buttons in command for sorting
  var $commandSort = $menuHeader.appendDiv('header-group');
  $commandSort.appendDiv('header-text')
    .data('label', session.text('ColumnSorting'));

  var $sortAsc = $commandSort.appendDiv('header-command sort-asc')
    .data('label', session.text('ui.ascending'))
    .click(this.remove.bind(this))
    .click(function() {
      sort('asc', false, $(this).hasClass('selected'));
    });
  var $sortDesc = $commandSort.appendDiv('header-command sort-desc')
    .data('label', session.text('ui.descending'))
    .click(this.remove.bind(this))
    .click(function() {
      sort('desc', false, $(this).hasClass('selected'));
    });

  var $sortAscAdd = $commandSort.appendDiv('header-command sort-asc-add')
    .data('label', session.text('ui.ascendingAdditionally'))
    .click(this.remove.bind(this))
    .click(function() {
      sort('asc', true, $(this).hasClass('selected'));
    });
  var $sortDescAdd = $commandSort.appendDiv('header-command sort-desc-add')
    .data('label', session.text('ui.descendingAdditionally'))
    .click(this.remove.bind(this))
    .click(function() {
      sort('desc', true, $(this).hasClass('selected'));
    });

  sortSelect();

  // create buttons in command for grouping, if there is at least one number column
  var containsNumberColumn = scout.arrays.find(table.columns, function(column) {
    return column.type === 'number';
  });

  if (containsNumberColumn) {
    var $commandGroup = $menuHeader.appendDiv('header-group');
    $commandGroup.appendDiv('header-text')
      .data('label', session.text('ui.Sum'));

    var $groupAll = $commandGroup.appendDiv('header-command group-all')
      .data('label', session.text('ui.overEverything'))
      .click(this.remove.bind(this))
      .click(groupAll);

    var $groupSelection = $commandGroup.appendDiv('header-command group-selection')
    .data('label', session.text('ui.overSelection'))
    .click(this.remove.bind(this))
    .click(groupSelection);


    if (column.type !== 'number') {
      var $groupSort = $commandGroup.appendDiv('header-command group-sort')
        .data('label', session.text('ui.grouped'))
        .click(this.remove.bind(this))
        .click(groupSort);
    }
    groupSelect();
  }

  // create buttons in command for coloring
  if (column.type === 'number') {
    var $commandColor = $menuHeader.appendDiv('header-group');
    $commandColor.appendDiv('header-text')
      .data('label', session.text('ui.ColorCells'));

    $commandColor.appendDiv('header-command color-red')
      .data('label', session.text('ui.fromRedToGreen'))
      .click(this.remove.bind(this))
      .click(colorRed);
    $commandColor.appendDiv('header-command color-green')
      .data('label', session.text('ui.fromGreenToRed'))
      .click(this.remove.bind(this))
      .click(colorGreen);
    $commandColor.appendDiv('header-command color-bar')
      .data('label', session.text('ui.withBarGraph'))
      .click(this.remove.bind(this))
      .click(colorBar);
    $commandColor.appendDiv('header-command color-remove')
      .data('label', session.text('ui.remove'))
      .click(this.remove.bind(this))
      .click(colorRemove);
  }

  // create buttons in command for new columns
  // TODO cru: improve organize table
  /*
  var $commandColumn = $menuHeader.appendDiv('header-group');
  $commandColumn.appendDiv('header-text')
    .data('label', session.text('Column'));

  $commandColumn.appendDiv('header-command column-add')
    .data('label', session.text('ui.add'))
    .click(columnAdd);
  $commandColumn.appendDiv('header-command column-remove')
    .data('label', session.text('ui.remove'))
    .click(columnRemove);
   */

  // filter
  var $headerFilter = $menuHeader.appendDiv('header-group-filter');
  $headerFilter.appendDiv('header-text')
    .data('label', session.text('ui.FilterBy'));

  var group = (column.type === 'date') ? scout.ChartTableControlMatrix.DateGroup.YEAR : -1,
    matrix = new scout.ChartTableControlMatrix(table, session),
    xAxis = matrix.addAxis(column, group),
    cube = matrix.calculateCube();

  var $headerFilterContainer = $headerFilter.appendDiv('header-filter-container'),
    $filter;

  for (var a = 0; a < xAxis.length; a++) {
    var key = xAxis[a],
      mark = xAxis.format(key),
      value = cube.getValue([key]).length;

    $filter = $headerFilterContainer.appendDiv('header-filter', mark)
      .attr('data-xAxis', key)
      .click(filterClick)
      .attr('data-value', value);

    if (column.filter.indexOf(key) > -1) {
      $filter.addClass('selected');
    }
  }
  // mark last element
  $filter.addClass('last');

  this.$headerFilterContainer = $headerFilterContainer;
  scout.scrollbars.install($headerFilterContainer, session);

  var containerHeight = $headerFilterContainer.get(0).offsetHeight,
    scrollHeight = $headerFilterContainer.get(0).scrollHeight;

  if (containerHeight >= scrollHeight) {
    $headerFilterContainer.css('height', 'auto');
    scrollHeight = $headerFilterContainer.get(0).offsetHeight;
    $headerFilterContainer.css('height', scrollHeight);
  }

  // name all label elements
  $('.header-text').each(function() {
    $(this).text($(this).data('label'));
  });

  // set events to buttons
  $menuHeader
    .on('mouseenter click', '.header-command', enterCommand)
    .on('mouseleave', '.header-command', leaveCommand);

  // copy flags to menu
  if ($header.hasClass('sort-asc')) {
    $menuHeader.addClass('sort-asc');
  }
  if ($header.hasClass('sort-desc')) {
    $menuHeader.addClass('sort-desc');
  }
  if ($header.hasClass('filter')) {
    $menuHeader.addClass('filter');
  }

  var that = this;

  function onMouseDown(event) {
    if ($header.is($(event.target))) {
      return;
    }

    removeMenu(event);
  }

  function removeMenu(event) {
    if ($menuHeader.has($(event.target)).length === 0) {
      that.remove();
    }
  }

  // event handling
  function enterCommand() {
    var $command = $(this),
      $text = $command.siblings('.header-text'),
      text = $command.hasClass('selected') ? session.text('ui.remove') : $command.data('label');

    $text.text($text.data('label') + ' ' + text);
  }

  function leaveCommand() {
    var $command = $(this),
      $text = $command.siblings('.header-text');

    $text.text($text.data('label'));
  }

  function moveTop() {
    table.moveColumn(column, pos, 0);
    pos = table.columns.indexOf(column);
  }

  function moveUp() {
    table.moveColumn(column, pos, Math.max(pos - 1, 0));
    pos = table.columns.indexOf(column);
  }

  function moveDown() {
    table.moveColumn(column, pos, Math.min(pos + 1, table.header.findHeaderItems().length - 1));
    pos = table.columns.indexOf(column);
  }

  function moveBottom() {
    table.moveColumn(column, pos, table.header.findHeaderItems().length - 1);
    pos = table.columns.indexOf(column);
  }

  function sort(direction, multiSort, remove) {
    table.removeGrouping();
    table.sort(column, direction, multiSort, remove);

    sortSelect();
  }

  function sortSelect() {
    var addIcon = '\uF067',
      sortCount = getSortColumnCount();

    $('.header-command', $commandSort).removeClass('selected');

    if (sortCount === 1) {
      if ($header.hasClass('sort-asc')) {
        $sortAsc.addClass('selected');
        addIcon = null;
      } else if ($header.hasClass('sort-desc')) {
        $sortDesc.addClass('selected');
        addIcon = null;
      }
    } else if (sortCount > 1) {
      if ($header.hasClass('sort-asc')) {
        $sortAscAdd.addClass('selected');
        addIcon = column.sortIndex + 1;
      } else if ($header.hasClass('sort-desc')) {
        $sortDescAdd.addClass('selected');
        addIcon = column.sortIndex + 1;
      }
    } else {
      addIcon = null;
    }

    if (addIcon) {
      $sortAscAdd.show().attr('data-icon', addIcon);
      $sortDescAdd.show().attr('data-icon', addIcon);
    } else {
      $sortAscAdd.hide();
      $sortDescAdd.hide();
    }
  }

  function getSortColumnCount() {
    var sortCount = 0;

    for (var i = 0; i < table.columns.length; i++) {
      if (table.columns[i].sortActive) {
        sortCount++;
      }
    }

    return sortCount;
  }

  function groupAll() {
    doGroup($(this), null, false);
  }

  function groupSelection() {
    doGroup($(this), null, true);
  }

  function groupSort() {
    doGroup($(this), column, false);
  }

  function doGroup($command, column, selection) {
    if ($command.isSelected()) {
      table.removeGrouping();
    } else {
      table.group(column, selection);
    }

    sortSelect();
    groupSelect();
  }

  function groupSelect() {
    $groupAll.removeClass('selected');
    if ($groupSort) {
      $groupSort.removeClass('selected');
    }

    if (table.grouped && !table.groupedSelection) {
      $groupAll.addClass('selected');
    }

    if (table.grouped && table.groupedSelection) {
      $groupSelection.addClass('selected');
    }

    if (column.grouped) {
      $groupSort.addClass('selected');
    }
  }

  function colorRed() {
    table.colorData(column, 'red');
  }

  function colorGreen() {
    table.colorData(column, 'green');
  }

  function colorBar() {
    table.colorData(column, 'bar');
  }

  function colorRemove() {
    table.colorData(column, 'remove');
  }

  function columnAdd() {}

  function columnChange() {}

  function columnRemove() {}

  function filterClick(event) {
    var $clicked = $(this);

    // change state
    if ($clicked.hasClass('selected')) {
      $clicked.removeClass('selected');
    } else {
      $clicked.addClass('selected');
    }

    //  prepare filter
    column.filter = [];

    //  find filter
    $('.selected', $headerFilter).each(function() {
      var dX = parseFloat($(this).attr('data-xAxis'));
      dX = isNaN(dX) ? null : dX;
      column.filter.push(dX);
    });

    // filter function
    if (column.filter.length) {
      column.filterFunc = function($row) {
        var row = $row.data('row'),
          textX = table.cellValue(xAxis.column, row),
          nX = xAxis.norm(textX);
        return (column.filter.indexOf(nX) > -1);
      };
    } else {
      column.filterFunc = null;
    }

    // callback to table
    table.filter();
  }
};

scout.TableHeaderMenu.prototype.remove = function() {
  scout.scrollbars.uninstall(this.$headerFilterContainer, this.session);
  this.$headerMenu.remove();
  this.$header.removeClass('menu-open');
  $(window).off('mousedown.tableheadermenu');
  $(window).off('keydown.tableheadermenu');
};

scout.TableHeaderMenu.prototype.isOpenFor = function($header) {
  return this.$header.is($header) && this.$header.hasClass('menu-open');
};

scout.TableHeaderMenu.prototype.isOpen = function() {
  return this.$header.hasClass('menu-open');
};

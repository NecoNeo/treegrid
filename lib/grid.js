(function (jQuery, methodName, factory) {

    if (jQuery && !jQuery[methodName]) {
        jQuery[methodName] = factory(jQuery);
    }

})(jQuery, '_grid', function ($) {

    "use strict";

    var NAMESPACE = '_grid',
        TABLE_BORDER_WIDTH = 2,
        TD_BORDER_WIDTH = 1,
        TH_HEIGHT = 30,
        TD_HEIGHT = 25,
        TDTH_PADDING_HOR = 3,
        TDTH_PADDING_VER = 1,
        SCROLL_WIDTH = 15;

    //constructor
    var Grid = function (el, options) {
        var _version = 1;

        this.options = {
            checkbox: false,
            index: false,
            selectionDisabled: true,
            columns: [],
            height: 400,
            width: 800,
            rowHeight: 24,
            selectRow: function (row, colIndex, rowIndex, initRowIndex) { /*console.log(row);*/ },
            formatters: {},
            sortBy: {},
            getPageData: true
        };

        this.$el = el;
        this.$container = null;
        this.$scroller = null;
        
        this.$mainHeadersDiv = null;
        this.$mainHeaders = null;
        this.$leftHeaders = null;
        this.$rightHeaders = null;

        this.$mainColumns = null;
        this.$leftColumns = null;
        this.$rightColumns = null;

        this.tables = [];
        this.formatters = {};
        this.sortBy = {};
        this.currentSortColIndex = null;

        this.columns = {
            'left'   : [],
            'normal' : [],
            'right'  : []
        };
        this.sortedCols = [];

        this.rows = [];
        this.sortedRowIndex = [];
        this.activeRowIndex = [];

        for (var opt in options) this.options[opt] = options[opt];

        this.$el.data(NAMESPACE, this);

        _init.apply(this);
    };

    Grid.prototype = {
        constructor: Grid,

        destroy: function () {
            this.$container.after(this.$el);
            this.$container.remove();
            this.$el.data(NAMESPACE, undefined);
            return this.$el;
        },

        empty: function () {
            $.each(this.tables, function (i, table) {
                table.$tbody.empty();
            });
        },

        setRows: function (rows) {
            var self = this;
            if ($.isArray(rows)) {
                this.rows = rows;
            } else {
                return false;
            }
            //_initSortIndex.apply(this);
            this.sortRowsByColumn(this.currentSortColIndex);
            _appendRows.apply(this);
            return true;
        },

        getRows: function () {
            return $.extend(true, [], this.rows);
        },

        getSelectedRows: function () {
            var self = this,
                result = [];
            $.each(this.activeRowIndex, function (i, e) {
                result.push($.extend(true, {}, self.rows[e]));
            });
            return result;
        },

        getSelectedRowIndexes: function () {
            return $.extend(true, [], this.activeRowIndex);
        },

        sortRowsByColumn: function (colIndex, asc) {
            var func, col;
            col = this.sortedCols[colIndex];
            if (!col) {
                _initSortIndex.apply(this);
                _appendRows.apply(this);
                _recoverActiveRowStatus.apply(this);
                this.currentSortColIndex = null;
                return;
            }

            if (asc != -1) {
                asc = 1;
            }

            if (col.sortBy && this.sortBy[col.sortBy]) {
                func = this.sortBy[col.sortBy];
            } else {
                func = this.sortBy['default'];
            }

            _sortRows.call(this, func, colIndex, asc);
            _appendRows.apply(this);
            _recoverActiveRowStatus.apply(this);
            this.currentSortColIndex = colIndex;
        }
    };

    //support functions for Grid (private)

    var _init = function () {
        var self = this;
        this.formatters = new Formatters(this.options.formatters);
        this.sortBy = new SortBy(this.options.sortBy);

        _initDOM.apply(this);
        _initColumns.call(this, this.options.columns);
        _DOMResize.apply(this);
        _bindScrollEvent.apply(this);
        _createDOMColumns.apply(this);
    };

    var _initColumns = function (colOpts) {
        var self = this,
            colIndex = 0,
            initIndex = 0,
            cols = {
                'left'   : [],
                'normal' : [],
                'right'  : []
            },
            sortedCols = [],
            leftColumnsWidth = 0,
            rightColumnsWidth = 0,
            mainColumnsWidth = 0,
            adaptFactor = 1;

        if (this.options.checkbox) {
            var $checkbox = $('<input type="checkbox" data-role="checkboxoverall">');
            $checkbox.change(function (e) {
                var $this = $(this),
                    checked = $this.prop('checked');
                
                self.$container.find('[data-role=rowcheckbox]').each(function () {
                    $(this).prop('checked', checked);
                });
                _updateActiveRowStatus.call(self, false);
            }).click(function (e) {
                e.stopPropagation();
            });
            cols.left.push({
                'name': $checkbox,
                'key': null,
                'formatter': 'checkbox',
                'sortBy': 'none',
                'width': 50,
                'adaptedWidth': 50,
                'freeze': 'left',
                'align': 'center',
                'index': undefined,
                'initIndex': initIndex++
            });
            leftColumnsWidth += 50;
        }

        if (this.options.index) {
            cols.left.push({
                'name': 'index',
                'key': null,
                'formatter': 'index',
                'sortBy': 'none',
                'freeze': 'left',
                'align': 'left',
                'width': 60,
                'adaptedWidth': 60,
                'index': undefined,
                'initIndex': initIndex++
            })
            leftColumnsWidth += 60;
        }

        if (colOpts.length < 1) {
            colOpts = _getColumnsFromHtml.apply(this);
        }

        $.each(colOpts, function (i, opt) {
            var col = {
                'name': '',
                'formatter': null,
                'sortBy': '',
                'key': null,
                'width': 150,
                'adaptedWidth': 150,
                'freeze': 'normal',
                'align': 'center',
                'index': undefined,
                'initIndex': initIndex++
            };
            $.extend(col, opt);
            if (col.freeze == 'left') {
                col.adaptedWidth = col.width;
                leftColumnsWidth += col.width;
                cols.left.push(col);
            } else if (col.freeze == 'right') {
                col.adaptedWidth = col.width;
                rightColumnsWidth += col.width;
                cols.right.push(col);
            } else {
                col.adaptedWidth = col.width;
                mainColumnsWidth += col.width;
                cols.normal.push(col);
            }
        });

        //automatically extend the width of center columns
        if ( (leftColumnsWidth + rightColumnsWidth + mainColumnsWidth + SCROLL_WIDTH) < this.options.width ) {
            adaptFactor = (this.options.width - leftColumnsWidth - rightColumnsWidth - SCROLL_WIDTH) / mainColumnsWidth;
            $.each(cols.normal, function (i, c) {
                c.adaptedWidth = Math.ceil(c.width * adaptFactor);
            });
        }

        for (var pos in cols) {
            $.each(cols[pos], function (i, c) {
                c.index = colIndex++;
                sortedCols.push(c);
                //console.log(JSON.stringify(c));
            });
        }

        this.columns = cols;
        this.sortedCols = sortedCols;
    };

    var _getColumnsFromHtml = function () {
        var self = this,
            cols = [],
            $ths = self.$el.find('th');
        $.each($ths, function (i, e) {
            var col = _parseDataJSON($(e).attr('data-column'));
            cols.push(col);
        });
        return cols;
    };

    var _parseDataJSON = function (str) {
        var jsonStr, json;
        if (!str) str = "";
        jsonStr = "{" + str + "}";
        jsonStr = jsonStr.replace(/\'/g, '\"');
        try {
            json = JSON.parse(jsonStr);
        } catch (e) {
            console.warn('illegal json str: ' + jsonStr);
            return {};
        }
        return json;
    };

    var _initDOM = function () {
        var self = this;

        this.$el.hide();
        this.$container = $('<div class="jq_grid" data-role="container" style="overflow:hidden;position:relative;width:0;height:0;"></div>');
        if (this.options.selectionDisabled) this.$container[0].onselectstart = function () { return false };
        this.$el.after(this.$container);
        this.$el.appendTo(this.$container);

        this.$scroller = $('<div data-role="scroller" style="overflow:scroll;"></div>').appendTo(this.$container);

        this.$mainHeadersDiv = $('<div style="position:absolute;z-index:100;top:0;overflow:hidden;"><table data-role="main-headers"><thead><tr></tr></thead></table></div>')
            .appendTo(this.$container);
        $('<div data-role="leftheadersdiv" style="position:absolute;z-index:300;left:0;top:0;overflow:hidden;"><table data-role="left-headers"><thead><tr></tr></thead></table></div>')
            .appendTo(this.$container);
        $('<div data-role="rightheadersdiv" style="position:absolute;z-index:200;top:0;overflow:hidden;"><table data-role="right-headers"><thead><tr></tr></thead></table></div>')
            .appendTo(this.$container);
        this.$mainColumns = $('<table data-role="main-columns" style="margin-top:0;display:inline-table;"><thead><tr></tr></thead><tbody></tbody></table>')
            .appendTo(this.$scroller);
        $('<div data-role="leftcolumnsdiv" style="position:absolute;z-index:250;left:0;overflow:hidden;"><table data-role="left-columns"><tbody></tbody></table></div>')
            .appendTo(this.$container);
        $('<div data-role="rightcolumnsdiv" style="position:absolute;z-index:150;overflow:hidden;"><table data-role="right-columns"><tbody></tbody></table></div>')
            .appendTo(this.$container);

        //add bottom line
        //this.$container.append('<div style="position:absolute;z-index:300;background-color:#808080;left:0;bottom:' + SCROLL_WIDTH + 'px;width:' + (this.options.width - SCROLL_WIDTH) + 'px;height:' + TABLE_BORDER_WIDTH + 'px"></div>');

        this.$mainHeaders = this.$container.find('[data-role=main-headers]');
        this.$leftHeaders = this.$container.find('[data-role=left-headers]');
        this.$rightHeaders = this.$container.find('[data-role=right-headers]');
        this.$leftColumns = this.$container.find('[data-role=left-columns]');
        this.$rightColumns = this.$container.find('[data-role=right-columns]');

        this.tables = [
            {
                'pos': 'normal',
                '$tbody': this.$mainColumns.find('tbody')
            },
            {
                'pos': 'left',
                '$tbody': this.$leftColumns.find('tbody')
            },
            {
                'pos': 'right',
                '$tbody': this.$rightColumns.find('tbody')
            }
        ];
    };

    var _DOMResize = function () {
        var self = this,
            leftPadding, rightPadding, topPadding;
        leftPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.left.length; i++) {
                sum += (self.columns.left[i].adaptedWidth);
            }
            return sum + TABLE_BORDER_WIDTH;
        })();
        rightPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.right.length; i++) {
                sum += (self.columns.right[i].adaptedWidth);
            }
            return sum + TABLE_BORDER_WIDTH;
        })();
        topPadding = TH_HEIGHT;

        this.$container.width(this.options.width);
        this.$container.height(this.options.height);
        this.$scroller.width(this.options.width);
        this.$scroller.height(this.options.height);

        this.$mainHeadersDiv.css({
            'left': leftPadding - TABLE_BORDER_WIDTH,
            'width': self.options.width - leftPadding - rightPadding
        });
        $('[data-role=leftheadersdiv]').width(leftPadding);
        $('[data-role=rightheadersdiv').css({
            'right': SCROLL_WIDTH,
            'width': rightPadding,
        });
        this.$mainColumns.css({
            'margin-left': leftPadding - TABLE_BORDER_WIDTH,
            'margin-right': rightPadding - TABLE_BORDER_WIDTH
        });
        $('[data-role=leftcolumnsdiv]').css({
            'top': topPadding,
            'width': leftPadding,
            'height': self.options.height - topPadding - SCROLL_WIDTH
        });
        $('[data-role=rightcolumnsdiv]').css({
            'right': SCROLL_WIDTH,
            'top': topPadding,
            'width': rightPadding,
            'height': self.options.height - topPadding - SCROLL_WIDTH
        });
    };

    var _bindScrollEvent = function () {
        var self = this;
        this.$scroller.on('scroll', function (e) {
            var $this, scrollX, scrollY;
            $this = $(this);
            scrollX = $this.scrollLeft();
            scrollY = $this.scrollTop();

            self.$leftColumns.css({
                'transform': 'translate(0,-' + scrollY + 'px)'
            });
            self.$rightColumns.css({
                'transform': 'translate(0,-' + scrollY + 'px)'
            });
            self.$mainHeaders.css({
                'transform': 'translate(-' + scrollX + 'px,0)'
            });
        });

        this.$container.on('mousewheel', [this.$leftColumns, this.$rightColumns], function (e) {
            var deltaY = self.$scroller.scrollTop() + e.originalEvent.deltaY;
            e.preventDefault();
            self.$scroller.scrollTop(deltaY);
        });
    };

    var _createDOMColumns = function () {
        var self = this;

        $.each(this.sortedCols, function (i, col) {
            var $header, $scrollHeader, $th, $hiddenTh;

            if (col.freeze == 'left') {
                $header = self.$leftHeaders.find('tr');
            } else if (col.freeze == 'right') {
                $header = self.$rightHeaders.find('tr');
            } else {
                $header = self.$mainHeaders.find('tr');
                $scrollHeader = self.$mainColumns.find('thead').find('tr');
                $hiddenTh = $('<th style="width:' + col.adaptedWidth + 'px;" data-colindex="' + col.index + '"></th>').append(col.name).appendTo($scrollHeader);
            }

            $th = $('<th style="width:' + col.adaptedWidth + 'px;" data-colindex="' + col.index + '"></th>').append(col.name);
            $th.hover(function () {
                self.$container.find('td[data-colindex=' + col.index + ']').addClass('col-hover');
            }, function () {
                self.$container.find('td[data-colindex=' + col.index + ']').removeClass('col-hover');
            });
            $th.click(function () {
                var $this = $(this);

                if ( self.currentSortColIndex == col.index ) {
                    $this.removeClass('sort-col');
                    self.sortRowsByColumn();
                } else {
                    self.$container.find('th').removeClass('sort-col');
                    $this.addClass('sort-col');
                    self.sortRowsByColumn(col.index);
                }
            });
            $th.appendTo($header);
        });
    };

    var _appendRows = function () {
        var self = this,
            rows = [];
        this.empty();
        $.each(this.sortedRowIndex, function (i, e) {
            rows.push(self.rows[e]);
        });
        $.each(rows, function (index, row) {
            _appendRow.call(self, row, index, self.sortedRowIndex[index]);
        });
    };

    var _appendRow = function (row, rowIndex, originalRowIndex) {
        var self = this;

        $.each(this.tables, function (t, table) {
            var $row = $('<tr></tr>');
            table.$tbody.append($row);
            $.each(self.columns[table.pos], function (i, col) {
                var rowContent;
                if (col.formatter && typeof self.formatters[col.formatter] == 'function') {
                    rowContent = self.formatters[col.formatter].call(self, row, col, rowIndex, originalRowIndex);
                } else {
                    rowContent = row[col.key];
                }
                if (rowContent === null || rowContent === undefined) {
                    rowContent = '';
                }
                $row.append( $('<td style="width:' + col.adaptedWidth + 'px; height:' + self.options.rowHeight + 'px;" data-rowindex="' + rowIndex + '" data-colindex="' + col.index + '"></td>')
                    .append(rowContent)
                    .css({
                        'text-align': col.align
                    })
                    .hover(function () {
                        self.$container.find('td[data-rowindex=' + rowIndex + ']').addClass('row-hover');
                        self.$container.find('td[data-colindex=' + col.index + ']').addClass('col-hover');
                    }, function () {
                        self.$container.find('td[data-rowindex=' + rowIndex + ']').removeClass('row-hover');
                        self.$container.find('td[data-colindex=' + col.index + ']').removeClass('col-hover');
                    })
                    .click(function () {
                        self.options.selectRow(row, col, rowIndex, originalRowIndex);
                    }) );
            });
        });

    };

    var _updateActiveRowStatus = function (checkTop) {
        var self = this,
            checkFlag = true;

        //check whether all checkbox is checked
        if (checkTop) {
            self.$container.find('[data-role=rowcheckbox]').each(function () {
                if (!$(this).prop('checked')) {
                    checkFlag = false;
                    return false;
                }
            });
            self.$container.find('[data-role=checkboxoverall]').prop('checked', checkFlag);
        }

        this.activeRowIndex = [];
        this.$container.find('[data-role=rowcheckbox]').each(function (i, e) {
            var $this = $(this);
            if ($this.prop('checked')) {
                self.activeRowIndex.push( parseInt($this.attr('data-originalrowindex')) );
            }
        });
        this.$container.find('td[data-rowindex]').removeClass('active');
        $.each(this.activeRowIndex, function (i, index) {
            var rowIndex;
            $.each(self.sortedRowIndex, function (j, sIndex) {
                if (index == sIndex) {
                    rowIndex = j;
                    return false;
                }
            });
            self.$container.find('td[data-rowindex=' + rowIndex + ']').addClass('active');
        });
    };

    var _recoverActiveRowStatus = function () {
        var self = this;
        $.each(this.activeRowIndex, function (i, index) {
            self.$container.find('input[data-originalrowindex = ' + index + ']').prop('checked', true);
        });
        _updateActiveRowStatus.call(self, true);
    };

    //sort
    var _sortRows = function (func, colIndex, asc) {
        var self = this,
            colKey;

        colKey = this.sortedCols[colIndex].key;

        _initSortIndex.apply(this);

        if (func == defaultSortFuncs.none) return;   //the built-in javascript sort method will change the sequence even though all value is same

        this.sortedRowIndex.sort(function (a, b) {
            return asc * func(self.rows[a], self.rows[b], colKey);
        });
    };

    var defaultSortFuncs = {

        'default': function (rowA, rowB, colKey) {
            var strA = new String(rowA[colKey]),
                strB = new String(rowB[colKey]);
            return strA.localeCompare(strB);
        },

        'none': function () {
            return 0;
        }
    };

    var SortBy = function (customSorters) {
        for (var func in customSorters) {
            this[func] = customSorters[func];
        }
    }
    SortBy.prototype = defaultSortFuncs;

    var _initSortIndex = function () {
        var sortIndex = [];
        for (var i = 0; i < this.rows.length; i++) {
            sortIndex.push(i);
        }
        this.sortedRowIndex = sortIndex;
    }

    //formatters

    var defaultFormatters = {

        'checkbox': function (row, col, rowIndex, originalRowIndex) {
            var self = this,
                $checkbox = $('<input type="checkbox" data-role="rowcheckbox" data-colindex="' + col.index+ '" data-originalrowindex="' + originalRowIndex + '">');
            $checkbox.change(function () {
                _updateActiveRowStatus.call(self, true);
            });
            return $checkbox;
        },

        'index': function (row, col, rowIndex, originalRowIndex) {
            return rowIndex + 1;
        }
    };

    var Formatters = function (customFormatters) {
        for (var func in customFormatters) {
            this[func] = customFormatters[func];
        }
    };
    Formatters.prototype = defaultFormatters;
    
    /**
     * return jQuery util
     * @param {DOMElement|jQuery|String} element  the element to create the instance on
     * @param {Object} options   options for this instance
     * @return {Grid} a new grid instance
     */
    var method = function (element, options) {
        var grid,
            el = $(element).eq(0);

        if (!el.data(NAMESPACE)) {
            grid = new Grid(el, options);
        } else {
            grid = el.data(NAMESPACE);
        }

        return grid;
    };

    return method;
});
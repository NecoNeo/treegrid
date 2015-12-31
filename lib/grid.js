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

        this.columns = {
            'left'   : [],
            'normal' : [],
            'right'  : []
        };

        this.rows = [];
        this.sortedRowIndex = [];
        this.activeRowIndex = []; // => index for rows (not sorted rows)

        this.options = {
            checkbox: false,
            selectDisabled: true,
            columns: [],
            height: 400,
            width: 800,
            selectRow: function (row, colIndex, rowIndex) { /*console.log(row);*/ },
            formatters: {},
            getPageData: true
        };

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
            this.empty();
            $.each(this.rows, function (index, row) {
                _appendRow.call(self, index, row);
            });
            return true;
        },

        getRows: function () {
            return $.extend(true, [], this.rows);
        },

        getSelectedRows: function () {
            var self = this,
                result = [];
            $.each(this.activeRowIndex, function (i, e) {
                result.push(self.rows[e]);
            });
            return result;
        },

        getSelectedRowIndexes: function () {
            return this.activeRowIndex;
        }
    };

    //support functions for Grid (private)

    var _init = function () {
        var self = this;

        this.columns = _initColumns.call(this, this.options.columns);
        this.formatters = new Formatters(this.options.formatters);

        _initDOM.apply(this);
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
            };

        if (this.options.checkbox) {
            var $checkbox = $('<input type="checkbox" data-role="checkboxoverall">');
            $checkbox.change(function () {
                var $this = $(this),
                    checked = $this.prop('checked');
                self.$container.find('[data-role=rowcheckbox]').each(function () {
                    $(this).prop('checked', checked);
                });
                _updateActiveRowStatus.apply(self);
            });
            cols.left.push({
                'name': $checkbox,
                'key': null,
                'formatter': 'checkbox',
                'width': 50,
                'freeze': 'left',
                'align': 'center',
                'index': undefined,
                'initIndex': initIndex++
            });
        }

        $.each(colOpts, function (i, opt) {
            var col = {
                'name': '',
                'formatter': null,
                'key': null,
                'width': 150,
                'freeze': 'normal',
                'align': 'center',
                'index': undefined,
                'initIndex': initIndex++
            };
            $.extend(col, opt);
            if (col.freeze == 'left') {
                cols.left.push(col);
            } else if (col.freeze == 'right') {
                cols.right.push(col);
            } else {
                cols.normal.push(col);
            }
        });

        for (var pos in cols) {
            $.each(cols[pos], function (i, c) {
                c.index = colIndex++;
            });
        }

        return cols;
    };

    var _initDOM = function () {
        var self = this,
            leftHeadersDiv, rightHeadersDiv, leftColumnsDiv, rightColumnsDiv,
            leftPadding, rightPadding, topPadding;

        this.$el.hide();

        leftPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.left.length; i++) {
                sum += (self.columns.left[i].width);
            }
            return sum + TABLE_BORDER_WIDTH;
        })();
        rightPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.right.length; i++) {
                sum += (self.columns.right[i].width);
            }
            return sum + TABLE_BORDER_WIDTH;
        })();
        topPadding = TH_HEIGHT;

        this.$container = $('<div class="jq_grid" data-role="container" style="overflow:hidden;position:relative;"></div>');
        this.$container.width(this.options.width);
        this.$container.height(this.options.height);
        if (this.options.selectDisabled) this.$container[0].onselectstart = function () { return false };

        this.$el.after(this.$container);
        this.$el.appendTo(this.$container);

        this.$scroller = $('<div data-role="scroller" style="overflow:scroll;"></div>');
        this.$scroller.width(this.options.width);
        this.$scroller.height(this.options.height);
        this.$container.append(this.$scroller);

        this.$mainHeadersDiv = $('<div><table data-role="main-headers"><thead><tr></tr></thead></table></div>');
        this.$mainHeadersDiv.css({
            'position': 'absolute',
            'z-index': 100,
            'left': leftPadding - TABLE_BORDER_WIDTH,
            'top': 0,
            'width': self.options.width - leftPadding - rightPadding,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        leftHeadersDiv = $('<div><table data-role="left-headers"><thead><tr></tr></thead></table></div>');
        leftHeadersDiv.css({
            'position': 'absolute',
            'z-index': 300,
            'left': 0,
            'top': 0,
            'width': leftPadding,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        rightHeadersDiv = $('<div><table data-role="right-headers"><thead><tr></tr></thead></table></div>');
        rightHeadersDiv.css({
            'position': 'absolute',
            'z-index': 200,
            'right': SCROLL_WIDTH,
            'top': 0,
            'width': rightPadding,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        this.$mainColumns = $('<table data-role="main-columns"><thead><tr></tr></thead><tbody></tbody></table>');
        this.$mainColumns.css({
            'margin-top': 0,
            'margin-left': leftPadding - TABLE_BORDER_WIDTH,
            'margin-right': rightPadding - TABLE_BORDER_WIDTH,
            'display': 'inline-table'
        }).appendTo(this.$scroller);

        leftColumnsDiv = $('<div><table data-role="left-columns"><tbody></tbody></table></div>');
        leftColumnsDiv.css({
            'position': 'absolute',
            'z-index': 250,
            'left': 0,
            'top': topPadding,
            'width': leftPadding,
            'height': self.options.height - topPadding - SCROLL_WIDTH,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        rightColumnsDiv = $('<div><table data-role="right-columns"><tbody></tbody></table></div>');
        rightColumnsDiv.css({
            'position': 'absolute',
            'z-index': 150,
            'right': SCROLL_WIDTH,
            'top': topPadding,
            'width': rightPadding,
            'height': self.options.height - topPadding - SCROLL_WIDTH,
            'overflow': 'hidden'
        }).appendTo(this.$container);

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

        $.each(self.columns.left, function (i, col) {
            var $tr = self.$leftHeaders.find('tr'),
                $th = $('<th style="width:' + col.width + 'px;"></th>').append(col.name);
            $th.hover(function () {
                self.$container.find('td[data-colindex=' + col.index + ']').addClass('col-hover');
            }, function () {
                self.$container.find('td[data-colindex=' + col.index + ']').removeClass('col-hover');
            });
            $th.appendTo($tr);
        });

        $.each(self.columns.right, function (i, col) {
            var $tr = self.$rightHeaders.find('tr'),
                $th = $('<th style="width:' + col.width + 'px;"></th>').append(col.name);
            $th.hover(function () {
                self.$container.find('td[data-colindex=' + col.index + ']').addClass('col-hover');
            }, function () {
                self.$container.find('td[data-colindex=' + col.index + ']').removeClass('col-hover');
            });
            $th.appendTo($tr);
        });

        $.each(self.columns.normal, function (i, col) {
            var $tr = self.$mainHeaders.find('tr'),
                $colTr = self.$mainColumns.find('thead').find('tr'),
                $th = $('<th style="width:' + col.width + 'px;"></th>').append(col.name),
                $colTh = $('<th style="width:' + col.width + 'px;"></th>').append(col.name);
            $th.appendTo($tr);
            $th.hover(function () {
                self.$container.find('td[data-colindex=' + col.index + ']').addClass('col-hover');
            }, function () {
                self.$container.find('td[data-colindex=' + col.index + ']').removeClass('col-hover');
            });
            $colTh.appendTo($colTr);
        });
    };

    var _appendRow = function (rowIndex, row) {
        var self = this;

        $.each(this.tables, function (t, table) {
            var $row = $('<tr></tr>');
            table.$tbody.append($row);
            $.each(self.columns[table.pos], function (i, col) {
                var rowContent;
                if (col.formatter && typeof self.formatters[col.formatter] == 'function') {
                    rowContent = self.formatters[col.formatter].call(self, row, col, rowIndex);
                } else {
                    rowContent = row[col.key];
                }
                if (rowContent === null || rowContent === undefined) {
                    rowContent = '';
                }
                $row.append( $('<td style="width:' + col.width + 'px" data-rowindex="' + rowIndex + '" data-colindex="' + col.index + '"></td>')
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
                        self.options.selectRow(row, col, rowIndex);
                    }) );
            });
        });

    };

    var _updateActiveRowStatus = function () {
        var self = this;
        this.activeRowIndex = [];
        this.$container.find('[data-role=rowcheckbox]').each(function (i, e) {
            var $this = $(this);
            if ($this.prop('checked')) {
                self.activeRowIndex.push( parseInt($this.attr('data-rowindex')) );
            }
        });
        this.$container.find('td[data-rowindex]').removeClass('active');
        $.each(this.activeRowIndex, function (i, index) {
            self.$container.find('td[data-rowindex=' + index + ']').addClass('active');
        });
    };

    //formatters

    var defaultFormatters = {

        checkbox: function (row, col, rowIndex) {
            var self = this,
                $checkbox = $('<input type="checkbox" data-role="rowcheckbox" data-colindex="' + col.index+ '" data-rowindex="' + rowIndex + '">');
            $checkbox.change(function () {
                var $this = $(this),
                    checkFlag = true;

                //check whether all checkbox is checked
                self.$container.find('[data-role=rowcheckbox]').each(function () {
                    if (!$(this).prop('checked')) {
                        checkFlag = false;
                        return false;
                    }
                });
                self.$container.find('[data-role=checkboxoverall]').prop('checked', checkFlag);

                _updateActiveRowStatus.apply(self);
            });
            return $checkbox;
        },

        index: function (row, col, rowIndex) {
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
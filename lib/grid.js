(function (jQuery, methodName, factory) {

    if (jQuery && !jQuery[methodName]) {
        jQuery[methodName] = factory(jQuery);
    }

})(jQuery, '_grid', function ($) {

    "use strict";

    var NAMESPACE = '_grid';

    //constructor
    var Grid = function (el, options) {
        var _version = 1;

        this.$el = el;
        this.$container = null;
        this.$scroller = null;
        this.$mainColumns = null;
        this.$mainHeaders = null;
        this.$mainHeadersDiv = null;
        this.$leftHeaders = null;
        this.$rightHeaders = null;
        this.$leftColumns = null;
        this.$rightColumns = null;

        this.columns = {
            'left'   : [],
            'right'  : [],
            'normal' : []
        };
        this.rows = [];

        this.options = {
            checkbox: false,
            index: false,
            columns: [],
            height: 400,
            width: 800,
            selectRow: function (row) { console.log(row); },
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

        setRows: function (rows) {
            var self = this;
            if ($.isArray(rows)) {
                this.rows = rows;
            } else {
                return false;
            }
            $.each(rows, function (index, row) {
                _appendRow.call(self, row);
            });
            return true;
        },

        getRows: function () {
            return $.extend(true, [], this.rows);
        }
    };

    //support functions for Grid (private)

    var _init = function () {
        var self = this;
        this.columns = _initColumns.call(this, this.options.columns);
        _initDOM.apply(this);

        $.each(this.columns.normal, function (i, e) {
            self.$mainColumns.find('thead').find('tr').append('<th style="width:' + e.width + 'px">' + e.th + '</th>');
        });
    };

    var _initColumns = function (colOpts) {
        var cols = {
            'left'   : [],
            'right'  : [],
            'normal' : []
        };
        $.each(colOpts, function (i, e) {
            var col = {
                'name': '',
                'key': null,
                'width': 150,
                'freeze': 'normal'
            };
            $.extend(col, e);
            if (col.freeze == 'left') {
                cols.left.push(col);
            } else if (col.freeze == 'right') {
                cols.right.push(col);
            } else {
                cols.normal.push(col);
            }
        });
        return cols;
    };

    var _initDOM = function () {
        var self = this,
            leftHeadersDiv, rightHeadersDiv, leftColumnsDiv, rightColumnsDiv,
            leftPadding, rightPadding, topPadding, scrollWidth;

        this.$el.hide();

        leftPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.left.length; i++) {
                sum += (self.columns.left[i].width + 7);
            }
            return sum + 3;
        })();
        rightPadding = (function () {
            var sum = 0;
            for (var i = 0; i < self.columns.right.length; i++) {
                sum += (self.columns.right[i].width + 7);
            }
            return sum + 3;
        })();
        topPadding = 32;
        scrollWidth = 10;

        this.$container = $('<div class="jq_grid" data-role="container" style="overflow:hidden;position:relative;"></div>');
        this.$container.width(this.options.width);
        this.$container.height(this.options.height);
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
            'left': leftPadding - 2,
            'top': 0,
            'width': (self.options.width - leftPadding - rightPadding) + 'px',
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
            'right': scrollWidth,
            'top': 0,
            'width': rightPadding,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        this.$mainColumns = $('<table data-role="main-columns"><tbody></tbody></table>');
        this.$mainColumns.css({
            'margin-top': topPadding,
            'margin-left': leftPadding - 2,
            'margin-right': rightPadding - 2,
            'display': 'inline-table'
        }).appendTo(this.$scroller);

        leftColumnsDiv = $('<div><table data-role="left-columns"><tbody></tbody></table></div>');
        leftColumnsDiv.css({
            'position': 'absolute',
            'z-index': 250,
            'left': 0,
            'top': topPadding,
            'width': leftPadding,
            'height': self.options.height - topPadding - scrollWidth,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        rightColumnsDiv = $('<div><table data-role="right-columns"><tbody></tbody></table></div>');
        rightColumnsDiv.css({
            'position': 'absolute',
            'z-index': 150,
            'right': scrollWidth,
            'top': topPadding,
            'width': rightPadding,
            'height': self.options.height - topPadding - scrollWidth,
            'overflow': 'hidden'
        }).appendTo(this.$container);

        this.$mainHeaders = this.$container.find('[data-role=main-headers]');
        this.$leftHeaders = this.$container.find('[data-role=left-headers]');
        this.$rightHeaders = this.$container.find('[data-role=right-headers]');
        this.$leftColumns = this.$container.find('[data-role=left-columns]');
        this.$rightColumns = this.$container.find('[data-role=right-columns]');

        _createDOMColumns.apply(this);
        _bindScrollEvent.apply(this);
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

        $.each(self.columns.left, function (colIndex, col) {
            var $tr = self.$leftHeaders.find('tr'),
                $th = $('<th style="width:' + col.width + 'px;">' + col.name + '</th>');
            $th.appendTo($tr);
        });

        $.each(self.columns.right, function (colIndex, col) {
            var $tr = self.$rightHeaders.find('tr'),
                $th = $('<th style="width:' + col.width + 'px;">' + col.name + '</th>');
            $th.appendTo($tr);
        });

        $.each(self.columns.normal, function (colIndex, col) {
            var $tr = self.$mainHeaders.find('tr'),
                $th = $('<th style="width:' + col.width + 'px;">' + col.name + '</th>');
            $th.appendTo($tr);
        });
    };

    var _appendRow = function (row) {
        var self = this,
            $mainRow = $('<tr></tr>'),
            $leftRow = $('<tr></tr>'),
            $rightRow = $('<tr></tr>');

        self.$mainColumns.find('tbody').append($mainRow);
        $.each(self.columns.normal, function (i, col) {
            var rowstr = row[col.key];
            if (rowstr === null || rowstr === undefined) {
                rowstr = '';
            }
            $mainRow.append( $('<td style="width:' + col.width + 'px">' + rowstr + '</td>').click(function () {
                self.options.selectRow(row);
            }) );
        });

        self.$leftColumns.find('tbody').append($leftRow);
        $.each(self.columns.left, function (i, col) {
            var rowstr = row[col.key];
            if (rowstr === null || rowstr === undefined) {
                rowstr = '';
            }
            $leftRow.append( $('<td style="width:' + col.width + 'px">' + rowstr + '</td>').click(function () {
                self.options.selectRow(row);
            }) );
        });

        self.$rightColumns.find('tbody').append($rightRow);
        $.each(self.columns.right, function (i, col) {
            var rowstr = row[col.key];
            if (rowstr === null || rowstr === undefined) {
                rowstr = '';
            }
            $rightRow.append( $('<td style="width:' + col.width + 'px">' + rowstr + '</td>').click(function () {
                self.options.selectRow(row);
            }) );
        });
    };
    
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
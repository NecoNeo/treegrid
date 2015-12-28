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
            height: 300,
            width: 900,
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
        this.columns = _initColumns(this.options.columns);
        _initDOM.apply(this);

        $.each(this.columns.normal, function (i, e) {
            self.$mainColumns.find('thead').find('tr').append('<th style="width:' + e.width + 'px">' + e.th + '</th>');
        });
        // console.log(this.options);
        // console.log(this.columns);
    };

    var _initColumns = function (colOpts) {
        var cols = {
            'left'   : [],
            'right'  : [],
            'normal' : []
        };
        $.each(colOpts, function (i, e) {
            var col = {
                'th': '',
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
        var self = this;
        this.$el.hide();

        this.$container = $('<div class="jq_grid" style="overflow:scroll;position:relative;"></div>');
        this.$container.width(this.options.width);
        this.$container.height(this.options.height);
        this.$el.after(this.$container);
        this.$el.appendTo(this.$container);

        this.$scroller = $('<div data-role="scroller"></div>');

        this.$mainColumns = $('<table data-role="main_table"><thead><tr></tr></thead><tbody></tbody></table>');
        this.$mainColumns.css({
            'margin-top':  '0px',
            'margin-left': (function () {
                var sum = 0;
                for (var i = 0; i < self.columns.left.length; i++) {
                    sum += (self.columns.left[i].width + 2);
                }
                return (sum + 4) + 'px';
            })(),
            'position': 'block'
        });

        this.$mainHeaders = $('<table data-role="main_headers"><thead><tr></tr></thead></table>');

        this.$leftHeaders = $('<table data-role="left_headers"><thead><tr></tr></thead></table>');

        this.$rightHeaders = $('<table data-role="right_headers"><thead><tr></tr></thead></table>');

        this.$leftColumns = $('<table data-role="left_columns"><tbody></tbody></table>');
        this.$leftColumns.css({
            'position': 'absolute',
            'top':  '0px',
            'left': '0px'
        });

        this.$rightColumns = $('<table data-role="right_columns"><tbody></tbody></table>');
        this.$rightColumns.css({
            'position': 'absolute',
            'top':  '0px',
            'right': '0px'
        });

        this.$scroller.append(this.$mainColumns)
            .append(this.$mainHeaders);
        
        this.$container.append(this.$scroller)
            .append(this.$leftHeaders)
            .append(this.$rightHeaders)
            .append(this.$leftColumns)
            .append(this.$rightColumns);
        //
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
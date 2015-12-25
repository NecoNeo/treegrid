(function (jQuery, methodName, factory) {

    if (jQuery && !jQuery[methodName]) {
        jQuery[methodName] = factory(jQuery);
    }

})(jQuery, '_grid', function ($) {

    "use strict";

    var namespace = '_grid';

    //constructor
    var Grid = function (el, options) {
        var _version = 1;

        this.el = el;
        this.tab = null;

        this.options = {
            checkbox: false,
            columns: []
        };

        for (var opt in options) this.options[opt] = options[opt];

        this.el.data(namespace, this);

        this.init();
    };

    Grid.prototype = {
        constructor: Grid,

        init: function () {
            var self = this;
            this.el.hide();

            this.tab = $('<div></div>');
            this.el.after(this.tab);
            this.el.appendTo(this.tab);
            this.mainTable = $('<table class="test_grid"><thead><tr></tr></thead><tbody></tbody></table>').appendTo(this.tab);

            $.each(this.options.columns, function (i, e) {
                self.mainTable.find('thead').find('tr').append('<th>' + e.th + '</th>');
            });
            console.log(this.options);
        },

        destroy: function () {
            this.tab.after(this.el);
            this.tab.remove();
            this.el.data(namespace, undefined);
        },

        loadJSON: function (rows) {
            var self = this;
            $.each(rows, function (index, row) {
                var $row = $('<tr></tr>');
                self.mainTable.find('tbody').append($row);
                $.each(self.options.columns, function (i, col) {
                    $row.append('<td>' + row[col.key] + '</td>');
                });
            });
        }
    };

    var method = function (element, options) {
        var grid,
            el = $(element).eq(0);

        if (!el.data(namespace)) {
            grid = new Grid(el, options);
        } else {
            grid = el.data(namespace);
        }

        return grid;
    };

    return method;
});
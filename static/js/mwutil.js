
var mw = {};

mw.cmp = function (a, b) {
    if (a < b) {
        return -1;
    } else if (a > b) {
        return 1;
    } else {
        return 0;
    }
};

mw.arrayRemove = function (arr, elem) {
    var i = arr.indexOf(elem);
    if (i >= 0) {
        arr.splice(i, 1);
    }
};

mw.arrayRemovePred = function (pred) {
    var i;
    for (i = this.length - 1; i >= 0; i--) {
        if (pred(this[i])) {
            this.splice(i, 1);
        }
    }
};

mw.arrayBinarySearch = function (arr, elem, key) {
    var low = -1;
    var high = arr.length;
    var mid, comp;

    if (key === undefined) {
        key = mw.cmp;
    }

    while (high - low > 1) {
        mid = Math.floor((low + high) / 2);
        comp = key(elem, arr[mid]);

        if (comp > 0) {
            low = mid;
        } else if (comp < 0) {
            high = mid;
        } else {
            return arr[mid];
        }
    }

    return null;
};

mw.fixCoords = function (f) {
    return function (e) {
        var offset = $(e.target).offset();
        e.offsetX = e.pageX - offset.left;
        e.offsetY = e.pageY - offset.top;
        return f(e);
    };
};

mw.makeTable = function (rows, colStyles) {
    colStyles = colStyles || [];
    var table = document.createElement("table");
    var row, cell, rowI, colI;
    for (rowI = 0; rowI < rows.length; rowI++) {
        row = document.createElement("tr");
        
        for (colI = 0; colI < rows[rowI].length; colI++) {
            cell = document.createElement("td");
            $(cell)
                .css(colStyles[colI] || {})
                .append(rows[rowI][colI])
                .appendTo(row);
        }

        $(row).appendTo(table);
    }

    return table;
};

mw.makeSelect = function (choices) {
    var select = document.createElement("select");
    var i, option;
    for (i = 0; i < choices.length; i++) {
        option = document.createElement("option");
        if (Array.isArray(choices[i])) {
            option.textContent = choices[i][0];
            option.value = choices[i][1];
        } else {
            option.textContent = option.value = choices[i];
        }
        select.appendChild(option);
    }
    return select;
};

mw.flash = function (message) {
    var flash = jQuery('.flash');
    flash.hide();
    flash.html(message).append('<span class="close">&times;</span>').slideDown();
};

// property: {
//     name: "prop_name",
//     element: dom_element,
// }
mw.synchronize = function (object, properties) {
    var i, prop;
    var bindProp = function (p, f) {
        return function () { f(p); };
    };
    for (i = 0; i < properties.length; i++) {
        prop = properties[i];
        
        if (prop.element.nodeName == "input") {
            $(prop.element).change(
                bindProp(prop, function (prop) {
                    object[prop.name] = prop.element.value;
                })
            );
        } else if (prop.element.classList.indexOf("ui-slider") >= 0) {
            
        }
    }
};

(function ($) {
    $.fn.pannable = function () {
        return (this
        // Allow panning around the workspace with the mouse
            .mousedown(function (event) {
                if (event.button !== 0) {
                    return;
                }

                var parent = $(this).parent();
                $(this)
                    .data("mwLastMousePos",
                          { x: event.pageX, y: event.pageY })
                    .bind("mousemove", function (event) {
                        var lastPos = $(this).data("mwLastMousePos");
                        var x = parent.scrollLeft() - event.pageX + lastPos.x;
                        var y = parent.scrollTop() - event.pageY + lastPos.y;
                        parent
                            .scrollLeft(x)
                            .scrollTop(y);
                        $(this).data("mwLastMousePos",
                                     { x: event.pageX, y: event.pageY });
                    });
            })
            .mouseup(function (event) {
                $(this).unbind("mousemove");
            }));
    };

})(jQuery);



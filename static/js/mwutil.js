
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

mw.log = function (x, base) {
    return Math.log(x) / Math.log(base);
};

mw.arrayRemove = function (arr, elem) {
    var i = arr.indexOf(elem);
    if (i >= 0) {
        arr.splice(i, 1);
    }
};

mw.arrayRemovePred = function (arr, pred) {
    var i;
    for (i = arr.length - 1; i >= 0; i--) {
        if (pred(arr[i])) {
            arr.splice(i, 1);
        }
    }
};

mw.arraySearchPred = function (arr, pred) {
    var i;
    for (i = 0; i < arr.length; i++) {
        if (pred(arr[i])) {
            return i;
        }
    }
    return -1;
};

mw.CircularBuffer = function (size) {
    var that = this;
    var array, index;

    Object.defineProperties(this, {
        length: {
            get: function () { return size; }
        }
    });

    this.insert = function (x) {
        array[index % size] = x;
        index = (index + 1) % size;
    };

    this.at = function (i) {
        return array[(index + i) % size];
    };

    var init = function () {
        size = size || 10;
        array = [];
        index = 0;
    };
    init();
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

mw.fillSelect = function (select, choices) {
    choices = choices || [];
    $(select).empty();
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
};

// choices = [choice_name, [choice_name, choice_value], ...]
mw.makeSelect = function (choices) {
    var select = document.createElement("select");
    mw.fillSelect(select, choices);
    return select;
};

mw.flash = function (message) {
    var flash = jQuery('.flash');
    flash.hide();
    flash
        .html(message)
        .append('<span class="close">&times;</span>')
        .slideDown();
    setTimeout(function () { flash.fadeOut(); }, 5000);
};

// properties = { prop_name: dom_element, ... }
mw.synchronize = function (object, properties) {
    var bind = function (p, f) {
        return function () {
            var i, args = [p];
            for (i = 0; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            return f.apply(null, args);
        };
    };

    var newProps = {};
    var propName, propElement;
    for (propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            propElement = properties[propName];
            
            if (propElement.nodeName.toLowerCase() === "input"
                || propElement.nodeName.toLowerCase() === "select") {
                newProps[propName] = {
                    get: bind(propElement, function (pe) {
                        return pe.value;
                    }),
                    set: bind(propElement, function (pe, v) {
                        pe.value = v;
                    })
                };
            } else if (propElement.classList.contains("ui-slider")) {
                newProps[propName] = {
                    get: bind(propElement, function (pe) {
                        return $(pe).slider("value");
                    }),
                    set: bind(propElement, function (pe, v) {
                        $(pe).slider("value", v);
                    })
                };
            }
        }
    }

    Object.defineProperties(object, newProps);
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



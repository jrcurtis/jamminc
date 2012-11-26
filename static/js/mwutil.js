
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


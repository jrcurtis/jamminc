
var svg = {};

svg.SVG_NS = "http://www.w3.org/2000/svg";

// spec.type = 'move' | 'linear' | 'quadratic' | 'cubic'
// spec.relative
// spec.start
// spec.end
// spec.control
// spec.control2
svg.PathSegment = function (spec) {
    this.path = null;
    var type, relative, end, control, control2;

    var coord = function (value) {
        return { x: value.x || 0, y: value.y || 0 };
    };

    var updateFunc = function (func) {
        var uFunc = function () {
            func.apply(this, arguments);
            if (this.path) {
                this.path.update();
            }
        };
        return uFunc;
    };

    Object.defineProperties(this, {
        end: {
            get: function () { return end; },
            set: updateFunc(function (value) { end = coord(value); })
        },
        control: {
            get: function () { return control; },
            set: updateFunc(function (value) { control = coord(value); })
        },
        control2: {
            get: function () { return end; },
            set: updateFunc(function (value) { control2 = coord(value); })
        }
    });

    this.getCommand = function () {
        var cmd = [];

        var letter = svg.PathSegment.commandLetters[type];
        if (!relative) {
            letter = letter.toUpperCase();
        }
        cmd.push(letter);

        if (type === "quadratic" || type === "cubic") {
            cmd.push(control.x, control.y);
        }

        if (type === "cubic") {
            cmd.push(control2.x, control2.y);
        }

        cmd.push(end.x, end.y);

        return cmd.join(" ");
    };

    var init = function () {
        type = spec.type || "linear";
        relative = spec.relative || false;
        end = spec.end || { x: 0, y: 0 };
        control = spec.control || { x: 0, y: 0 };
        control2 = spec.control2 || { x: 0, y: 0 };
    };
    init();
};

svg.PathSegment.commandLetters = {
    move: "m",
    linear: "l",
    quadratic: "q",
    cubic: "c"
};

svg.Path = function (spec) {
    var that = this;

    var element;
    var segments = [];

    Object.defineProperties(this, {
        element: {
            get: function () { this.update(); return element; }
        },
        start: {
            get: function () { return segments[0].end; },
            set: function (value) { segments[0].end = value; }
        },
        end: {
            get: function () { return segments[segments.length - 1].end; },
            set: function (value) {
                segments[segments.length - 1].end = value;
            }
        },
        control: {
            get: function () { return segments[segments.length - 1].control; },
            set: function (value) {
                segments[segments.length - 1].control = value;
            }
        },
        control2: {
            get: function () { return segments[segments.length - 1].control2; },
            set: function (value) {
                segments[segments.length - 1].control2 = value;
            }
        }
    });

    this.getCommands = function () {
        return segments
            .map(function (s) { return s.getCommand(); })
            .join(" ");
    };

    this.update = function () {
        element.setAttribute("d", this.getCommands());
    };

    this.addSegments = function () {
        var i;
        for (i = 0; i < arguments.length; i++) {
            segments.push(arguments[i]);
            arguments[i].path = this;
        }
    };

    this.setSegments = function () {
        this.segments = [];
        this.addSegments.apply(this, arguments);
    };

    this.css = function (attrs) {
        var attr;
        for (attr in attrs) {
            if (attrs.hasOwnProperty(attr)) {
                element.style[attr] = attrs[attr];
            }
        }
        return this;
    };

    var init = function () {
        spec = spec || {};
        if (spec.segments) {
            that.addSegments.apply(that, spec.segments);
        }
        element = document.createElementNS(svg.SVG_NS, "path");
    };
    init();
};


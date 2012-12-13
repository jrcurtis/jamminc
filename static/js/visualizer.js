
var vis = {};

vis.Visualizer = function (spec) {
    spec = spec || {};
    var that = this;

    var canvas, ctx, color;
    var data, zoom, center;

    Object.defineProperties(this, {
        element: {
            get: function () { return canvas; }
        }
    });

    var zoomIn = function (x, amt) {
        var width = $(canvas).width();
        center = center + (x / width - 0.5) / zoom;
        zoom = Math.min(100, Math.max(1, zoom + amt));
        that.draw();
    };

    this.draw = function (d, opt) {
        data = d || data;
        opt = opt || {};

        var adjust = opt.adjust || true;
        var min = adjust ? mw.min(data) : opt.min || -1;
        var max = adjust ? mw.max(data) : opt.max || 1;
        var samples = data.length / zoom;
        var start = Math.floor(center * data.length - samples / 2);
        var scale = canvas.height / (max - min);
        var step = samples / canvas.width;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFF";
        ctx.font = "10px Console,Monaco,sans-serif";
        ctx.fillText(min, 3, canvas.height - 3);
        ctx.fillText(max, 3, 13);

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);

        var i, x;
        for (x = 0, i = start; x < canvas.width; x++, i += step) {
            ctx.lineTo(x, canvas.height - scale * (data[Math.floor(i)] - min));
        }
        ctx.stroke();
    };

    this.plot = function (d) {
        data.push(d);
    };

    this.reset = function (d) {
        data = [];
        zoom = 1;
        center = 0.5;
    };

    var init = function () {
        data = [];
        zoom = 1;
        center = 0.5;

        color = spec.color || "#0F0";

        canvas = document.createElement("canvas");
        $(canvas)
            .attr({ width: "500", height: "100" })
            .on('contextmenu', function (e) {
                zoomIn(e.clientX, -0.5);
                return false;
            })
            .click(function (e) {
                zoomIn(e.clientX, e.button === 0 ? 0.5 : -0.5);
                return false;
            });
        ctx = canvas.getContext("2d");
    };
    init();
};


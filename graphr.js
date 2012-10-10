
var mwGraphr = {};

mwGraphr.SVG_NS = "http://www.w3.org/2000/svg";

mwGraphr.randomColor = function () {
    var color = '#';
    for (var i = 0; i < 3; i++) {
        color += Math.floor(256 * Math.random()).toString(16);
    }
    return color;
};

mwGraphr.init = function () {
    $("#add-button").click(mwGraphr.addNode);
};

mwGraphr.addNode = function () {
    var node, title, background, inputs, outputs;
    var li, i;

    node = document.createElement("div");
    node.setAttribute("class", "graph-node");
    
    background = document.createElement("div");
    background.setAttribute("class", "graph-node-background");
    node.appendChild(background);

    title = document.createElement("div");
    title.setAttribute("class", "graph-node-title");
    title.textContent = "title";
    node.appendChild(title);

    inputs = document.createElement("ul");
    inputs.setAttribute("class", "graph-node-inputs");
    for (i = 0; i < 3; i++) {
        li = document.createElement("li");
        li.textContent = "input " + i;

        $(li).droppable({
            drop: function (event, ui) {
                var edge = ui.helper.data("mwEdge");
                ui.helper.data("mwEdge", null);
                $(this).data("mwEdge", edge);
                edge.setEnd(this);
            },
            accept: ".graph-node-outputs li"
        });

        inputs.appendChild(li);
    }
    node.appendChild(inputs);
    
    outputs = document.createElement("ul");
    outputs.setAttribute("class", "graph-node-outputs");
    for (i = 0; i < 2; i++) {
        li = document.createElement("li");
        li.textContent = "output " + i;

        $(li).draggable({
            helper: function () {
                var helper = document.createElement("div");
                helper.setAttribute("class", "graph-node-output-dot");

                var edge = mwGraphr.graphEdge({start: this, end: helper});
                $(helper).data("mwEdge", edge);
                $(this).data("mwEdge", edge);

                return helper;
            },
            cursorAt: {left: 6, top: 6},
            drag: function (event, ui) {
                ui.helper.data("mwEdge").update();
            },
            stop: function (event, ui) {
                var edge = ui.helper.data("mwEdge");
                if (edge !== null) {
                    edge.parentNode.removeChild(edge);
                }
            }
        });

        outputs.appendChild(li);
    }
    node.appendChild(outputs);

    $(node).draggable({
        handle: ".graph-node-title",
        containment: "parent",
        stack: ".graph-node",
        drag: function (event, ui) {
            $(this)
                .find(".graph-node-inputs li,.graph-node-outputs li")
                .each(function (i) {
                    var edge = $(this).data("mwEdge");
                    if (edge !== undefined) {
                        edge.update();
                    }
                });
        }
    });

    $("#graph").append(node);
};

mwGraphr.graphEdge = function (spec) {
    var that = document.createElementNS(mwGraphr.SVG_NS, "path");
    that.style.stroke = "#000";
    that.style.stroke_width = 3;
    that.style.fill = "none";
    that.style.z_index = -50;
    document.getElementById("graph-svg").appendChild(that);

    var start = spec.start;
    var end = spec.end;

    var update = function () {
        var origin = $("#graph-svg").offset();
        var p1 = $(start).offset();
        p1.left -= origin.left - $(start).width();
        p1.top -= origin.top - $(start).height() / 2;
        var p2 = $(end).offset();
        p2.left -= origin.left;
        p2.top -= origin.top - $(end).height() / 2;

        var commands = ["M", p1.left, p1.top,
                        "C", (p1.left + p2.left) / 2, p1.top,
                        (p1.left + p2.left) / 2, p2.top,
                        p2.left, p2.top];
        
        that.setAttribute("d", commands.join(" "));
    };
    that.update = update;

    var setStart = function (x) {
        start = x;
        that.update();
    };
    that.setStart = setStart;

    var setEnd = function (x) {
        end = x;
        that.update();
    };
    that.setEnd = setEnd;

    return that;
}

$(mwGraphr.init);



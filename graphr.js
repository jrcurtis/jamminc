
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
    Array.prototype.mwRemove = function (elem) {
        var i = this.indexOf(elem);
        if (i >= 0) {
            this.splice(i, 1);
        }
    };

    Array.prototype.mwRemovePred = function (pred) {
        var i;
        for (i = this.length - 1; i >= 0; i--) {
            if (pred(this[i])) {
                this.splice(i, 1);
            }
        }
    };
};

// Arguments:
//     spec.placement: the DOM element to place the graph in
mwGraphr.Graph = function (spec) {
    var that = this;
    var id, width, height, table, element, svg, selectionElement;
    var nodes, nodeTypes, terminalNodeType, terminalNode;

    var makeNodeSelection = function () {
        selectionElement = document.createElement("ul");
        selectionElement.setAttribute("class", "graph-node-selection");
        $(element).after(selectionElement);
    };

    var addSelectionElements = function () {
        var makeHelper = function (type) {
            return function () {
                var tempNode = new mwGraphr.GraphNode({type: type});
                var helperElement = tempNode.getElement();
                $(helperElement).data("mwNodeType", type);
                return helperElement;
            };
        };

        $(selectionElement).children().detach();
        var typeOrder = Object.keys(nodeTypes);
        typeOrder.sort();

        var i, li;
        for (i = 0; i < typeOrder.length; i++) {
            if (nodeTypes[typeOrder[i]].terminal) {
                continue;
            }

            li = document.createElement("li");
            li.textContent = nodeTypes[typeOrder[i]].name;
            selectionElement.appendChild(li);

            $(li)
                .draggable({
                    helper: makeHelper(nodeTypes[typeOrder[i]]),
                });
        };
    };

    var makeGraph = function () {
        table = document.createElement("table");
        table.setAttribute("class", "graph-table");
        var row = document.createElement("tr");
        table.appendChild(row);
        var leftCell = document.createElement("td");
        row.appendChild(leftCell);
        var rightCell = document.createElement("td");
        row.appendChild(rightCell);
        
        element = document.createElement("div");
        element.setAttribute("class", "graph");
        leftCell.appendChild(element);

        $(element)
            .droppable({
                accept: ".graph-node-selection li",
                drop: function (event, ui) {
                    that.addNode(
                        {type: ui.helper.data("mwNodeType")},
                        $(ui.helper).offset());
                }
            });

        svg = document.createElementNS(mwGraphr.SVG_NS, "svg");
        svg.setAttribute("class", "graph-svg");
        element.appendChild(svg);
        var x, y, path;
        for (x = 0; x < width; x += 30) {
            path = document.createElementNS(mwGraphr.SVG_NS, "path");
            path.setAttribute("d", ["M", x, 0, "l", 0, height].join(" "));
            path.style.stroke = "#8AF";
            path.style.stroke_width = "1px";
            svg.appendChild(path);
        }
        for (y = 0; y < height; y += 30) {
            path = document.createElementNS(mwGraphr.SVG_NS, "path");
            path.setAttribute("d", ["M", 0, y, "l", width, 0].join(" "));
            path.style.stroke = "#8AF";
            path.style.stroke_width = "1px";
            svg.appendChild(path);
        }

        makeNodeSelection();
        rightCell.appendChild(selectionElement);

        $(spec.placement || document.body).append(table);
    };

    
    this.addNodeTypes = function () {
        for (var i = 0; i < arguments.length; i++) {
            arguments[i].inputs = arguments[i].inputs || [];
            arguments[i].outputs = arguments[i].outputs || [];

            if (arguments[i].terminal) {
                terminalNodeType = arguments[i];
                terminalNode = this.addNode({type: terminalNodeType});
            }

            nodeTypes[arguments[i].name] = arguments[i];
        }
        addSelectionElements();
    };

    this.addNode = function (nodeSpec, offset) {
        nodeSpec.graph = this;
        var node = new mwGraphr.GraphNode(nodeSpec);
        nodes[node.getId()] = node;

        if (offset === undefined) {
            offset = {
                left: $(element).width() / 2,
                top: $(element).height() / 2
            };
        }

        var nodeElement = node.getElement();
        $(element).append(nodeElement);
        $(nodeElement).offset(offset);

        return node;
    };

    this.removeNode = function (node) {
        nodes.mwRemove(node);
        $(node.getElement()).detach();
    };

    this.initEval = function () {
        var nodeId;
        for (nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                nodes[nodeId].local = {};
            }
        }
    };

    this.haltEval = function () {
        var nodeId;
        for (nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                delete nodes[nodeId].local;
            }
        }
    };

    this.evaluate = function (global) {
        return terminalNode.evaluate(global);
    };

    this.serialize = function () {
        var data = {};
        data.nodes = {};
        var nodeId;
        for (nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                data.nodes[nodeId] = nodes[nodeId].serialize();
            }
        }
        return JSON.stringify(data);
    };

    this.deserialize = function (json) {
        var nodeId;
        for (nodeId in nodes) {
            if (nodes.hasOwnProperty(nodeId)) {
                nodes[nodeId].remove();
            }
        }
        terminalNode = null;

        var data = JSON.parse(json);

        // Create all the nodes and put them in the graph
        var nodeData, node;
        for (nodeId in data.nodes) {
            if (data.nodes.hasOwnProperty(nodeId)) {
                nodeData = data.nodes[nodeId];
                node = this.addNode(
                    { type: nodeTypes[nodeData.type], id: nodeId },
                    nodeData.offset);
                if (nodeData.type === terminalNodeType.name) {
                    terminalNode = node;
                }
            }
        }

        // Now that all the nodes exist, create the connections
        var inputName, inputData, edge;
        for (nodeId in data.nodes) {
            if (data.nodes.hasOwnProperty(nodeId)) {
                nodeData = data.nodes[nodeId];
                for (inputName in nodeData.inputs) {
                    if (nodeData.inputs.hasOwnProperty(inputName)) {
                        inputData = nodeData.inputs[inputName];

                        edge = new mwGraphr.GraphEdge({
                            start: {
                                object: nodes[inputData.object],
                                output: inputData.output
                            },
                            end: {
                                object: nodes[nodeId],
                                input: inputName
                            },
                            graph: that
                        });
                        edge.update();
                    }
                }
            }
        }
    };

    this.getElement = function () {
        return table;
    };

    this.getSvg = function () {
        return svg;
    };

    this.getId = function () {
        return id;
    };

    var init = function () {
        spec = spec || {};

        if (mwGraphr.Graph.count !== undefined) {
            mwGraphr.Graph.count++;
        } else {
            mwGraphr.Graph.count = 1;
        }

        id = mwGraphr.Graph.count;

        width = spec.width || 800;
        height = spec.height || 600;

        makeGraph();

        nodeTypes = {};
        nodes = [];
        terminalNodeType = null;
        terminalNode = null;
    };
    init();
};

mwGraphr.GraphNode = function (spec) {
    var that = this;
    var id, graph, type, widget;
    var inputs, outputs, element, inputElements, outputElements;

    // Create a list item representing an input
    var inputLi = function (inputNames) {
        var li = document.createElement("li");
        li.textContent = inputNames[1];
        inputElements[inputNames[0]] = li;

        $(li)
            .data("mwEdgeInput", null)
        // A drop on an input represents setting the source of the input,
        // overriding any previous source.
            .droppable({
                drop: function (event, ui) {
                    var edge = ui.helper.data("mwEdgeInput");
                    if (edge) {
                        edge.setEnd({
                            element: this,
                            object: that,
                            input: inputNames[0]
                        });
                    }
                },
                accept: ".graph-node-outputs li, .graph-node-inputs li"
            })
        // Dragging an input represents removing the input and possibly
        // putting it somewhere else.
            .draggable({
                helper: function () {
                    var helper = document.createElement("div");
                    var edge = $(this).data("mwEdgeInput");
                    if (edge === null) {
                        helper.setAttribute("class", "graph-no-dot");
                    } else {
                        helper.setAttribute("class", "graph-node-dot");
                        edge.setEnd({
                            element: helper,
                            object: null,
                            input: null
                        });
                    }
                    return helper;
                },
                cursorAt: {left: 6, top: 6},
                drag: function (event, ui) {
                    var edge = ui.helper.data("mwEdgeInput");
                    if (edge) {
                        edge.update();
                    }
                },
                stop: function (event, ui) {
                    var edge = ui.helper.data("mwEdgeInput");
                    if (edge) {
                        edge.remove();
                    }
                }
            });

        return li;
    };

    // Create a list item representing an output
    var outputLi = function (outputNames) {
        var li = document.createElement("li");
        li.textContent = outputNames[1];
        outputElements[outputNames[0]] = li;

        // Dragging an output creates a new edge that can be dropped onto
        // an input.
        $(li)
            .data("mwEdgeOutputs", [])
            .draggable({
                helper: function () {
                    var helper = document.createElement("div");
                    helper.setAttribute("class", "graph-node-dot");
                    var edge = new mwGraphr.GraphEdge({
                        start: {
                            object: that,
                            output: outputNames[0]
                        },
                        end: {
                            element: helper,
                            object: null,
                            input: null
                        },
                        graph: graph
                    });
                    return helper;
                },
                cursorAt: {left: 6, top: 6},
                drag: function (event, ui) {
                    ui.helper.data("mwEdgeInput").update();
                },
                stop: function (event, ui) {
                    var edge = ui.helper.data("mwEdgeInput");
                    if (edge) {
                        edge.remove();
                    }
                }
            });

        return li;
    };

    // Create the DOM elements for this node
    var node = function () {
        var element, title, close, background, inputs, outputs;
        var li, i;

        element = document.createElement("div");
        element.setAttribute("class", "graph-node");
        
        title = document.createElement("div");
        title.setAttribute("class", "graph-node-title");
        title.textContent = type.name;
        element.appendChild(title);

        if (!type.terminal) {
            close = document.createElement("div");
            close.setAttribute("class", "graph-node-close");
            $(close).click(function () { that.remove(); });
            title.appendChild(close);
        }

        if (type.widget !== undefined) {
            widget = type.widget();
            element.appendChild(widget);
        } else {
            inputs = document.createElement("ul");
            inputs.setAttribute("class", "graph-node-inputs");
            for (i = 0; i < type.inputs.length; i++) {
                inputs.appendChild(inputLi(type.inputs[i]));
            }
            element.appendChild(inputs);
        }
        
        outputs = document.createElement("ul");
        outputs.setAttribute("class", "graph-node-outputs");
        for (i = 0; i < type.outputs.length; i++) {
            outputs.appendChild(outputLi(type.outputs[i]));
        }
        element.appendChild(outputs);

        $(element).draggable({
            handle: ".graph-node-title",
            containment: "parent",
            stack: ".graph-node",
            drag: function (event, ui) {
                $(this)
                    .find(".graph-node-inputs li")
                    .each(function (i) {
                        var edge = $(this).data("mwEdgeInput");
                        if (edge) {
                            edge.update();
                        }
                    });
                $(this)
                    .find(".graph-node-outputs li")
                    .each(function (i) {
                        var edges = $(this).data("mwEdgeOutputs");
                        for (var j = 0; j < edges.length; j++) {
                            edges[j].update();
                        }
                    });
            },
            scroll: true
        });

        return element;
    };

    var checkInput = function (input) {
        if (inputs[input] === undefined) {
            throw new Error(type.name + " has no input: " + input);
        }
    };

    var checkOutput = function (output) {
        if (outputs[output] === undefined) {
            throw new Error(type.name + " has no output: " + output);
        }
    };

    this.addOutput = function (output, other, input, edge) {
        checkOutput(output);
        outputs[output].push({object: other, input: input, edge: edge});
    };

    this.removeOutput = function (output, other, input) {
        checkOutput(output);
        outputs[output].mwRemovePred(function (o) {
            return (o.object === other) && (o.input === input);
        });
    };

    this.setInput = function (input, other, output, edge) {
        checkInput(input);
        inputs[input] = {object: other, output: output, edge: edge};
    };

    this.removeInput = function (input) {
        checkInput(input);
        inputs[input] = null;
    };

    this.remove = function () {
        var inputName, outputName, i;
        for (inputName in inputs) {
            if (inputs.hasOwnProperty(inputName)
                && inputs[inputName] !== null) {
                inputs[inputName].edge.remove();
            }
        }
        for (outputName in outputs) {
            if (outputs.hasOwnProperty(outputName)
                && outputs[outputName] !== null) {
                for (i = outputs[outputName].length - 1; i >= 0; i--) {
                    outputs[outputName][i].edge.remove();
                }
            }
        }
        graph.removeNode(this);
    };

    this.evaluate = function (global) {
        var inputValues = {}, outputValues;
        var inputName, input;
        if (type.widget !== undefined) {
            inputValues.widget = widget;
        } else {
            for (inputName in inputs) {
                if (inputs.hasOwnProperty(inputName)) {
                    input = inputs[inputName];
                    outputValues = input.object.evaluate(global);
                    inputValues[inputName] = outputValues[input.output];
                }
            }
        }
        var ret = type.evaluate(inputValues, global, this.local);
        return ret;
    };

    this.serialize = function () {
        var data = {};

        data.offset = $(element).offset();
        data.type = type.name;

        data.inputs = {};
        var inputName;
        for (inputName in inputs) {
            if (inputs.hasOwnProperty(inputName)
                    && inputs[inputName] !== null) {
                data.inputs[inputName] = {
                    object: inputs[inputName].object.getId(),
                    output: inputs[inputName].output
                };
            }
        }

        data.outputs = {};
        var i, outputName;
        for (outputName in outputs) {
            if (outputs.hasOwnProperty(outputName)
                   && outputs[outputName] && outputs[outputName].length) {
                data.outputs[outputName] = [];
                for (i = 0; i < outputs[outputName].length; i++) {
                    data.outputs[outputName].push({
                        object: outputs[outputName][i].object.getId(),
                        input: outputs[outputName][i].input
                    });
                }
            }
        }

        return data;
    };

    this.getElement = function () {
        return element;
    };

    this.getInputElement = function (name) {
        return inputElements[name];
    };

    this.getOutputElement = function (name) {
        return outputElements[name];
    };

    this.getType = function () {
        return type;
    };

    this.getId = function () {
        return id;
    };

    var init = function () {
        var i;

        if (mwGraphr.GraphNode.count !== undefined) {
            mwGraphr.GraphNode.count++;
        } else {
            mwGraphr.GraphNode.count = 1;
        }

        id = spec.id || ('id_' + mwGraphr.GraphNode.count);

        graph = spec.graph;
        type = spec.type;

        widget = null;

        inputs = {};
        for (i = 0; i < type.inputs.length; i++) {
            inputs[type.inputs[i][0]] = null;
        }

        outputs = {};
        for (i = 0; i < type.outputs.length; i++) {
            outputs[type.outputs[i][0]] = [];
        }

        inputElements = {};
        outputElements = {};
        element = node();
    };
    init();
};

// Arguments:
//     spec.start: the output the edge is connected to
//                 { element: dom_element,
//                   object: mwGraphNode,
//                   output: output_name }
//     spec.end: the input the edge is connected to
//               { element: dom_element,
//                 object: mwGraphNode,
//                 input: input_name }
//     spec.graph: mwGraph
mwGraphr.GraphEdge = function (spec) {
    var that = this;
    var graph, path, start, end;

    // Visually update the path to correspond with the start and end
    this.update = function () {
        var origin = $(graph.getSvg()).offset();
        var p1 = $(start.element).offset();
        p1.left -= origin.left - $(start.element).width();
        p1.top -= origin.top - $(start.element).height() / 2;
        var p2 = $(end.element).offset();
        p2.left -= origin.left;
        p2.top -= origin.top - $(end.element).height() / 2;
        var mid = (p1.left + p2.left) / 2;

        var commands = ["M", p1.left, p1.top,
                        "C", mid, p1.top,
                        mid, p2.top,
                        p2.left, p2.top];
        
        path.setAttribute("d", commands.join(" "));
    };

    // Remove an edge and clean up the node object connections,
    // the dom element references, and the path object itself.
    this.remove = function () {
        if (end.object !== null) {
            start.object.removeOutput(start.output, end.object, end.input);
            end.object.removeInput(end.input);
        }

        $(start.element).data("mwEdgeOutputs").mwRemove(this);
        $(end.element).data("mwEdgeInput", null);

        path.parentNode.removeChild(path);
    };

    this.setStart = function (newStart) {
        // If this edge is already connecting two nodes,
        // then remove that connection
        if (start.object !== null && end.object !== null) {
            start.object.removeOutput(start.output, end.object, end.input);
            end.object.removeInput(end.input);
        }

        // Whether the new start already has connections or not,
        // just add this one on
        if (newStart.object !== null && end.object !== null) {
            newStart.object.addOutput(
                newStart.output, end.object, end.input, this);
            end.object.setInput(
                end.input, newStart.object, newStart.output, this);
        }

        $(start.element).data("mwEdgeOutputs").mwRemove(this);
        $(newStart.element).data("mwEdgeOutputs").push(this);
        start = newStart;

        this.update();
    };

    this.setEnd = function (newEnd) {
        // If newEnd already has an edge, remove those connections
        var oldEdge = $(newEnd.element).data("mwEdgeInput");
        if (oldEdge) {
            oldEdge.remove();
        }

        // If this edge already connected two nodes together,
        // then we need to clean it up.
        if (end.object !== null && start.object !== null) {
            start.object.removeOutput(start.output, end.object, end.input);
            end.object.removeInput(end.input);
        }

        // If this edge is being dropped on an input
        // then we need to establish a new connection
        if (newEnd.object !== null && start.object !== null) {
            start.object.addOutput(
                start.output, newEnd.object, newEnd.input, this);
            newEnd.object.setInput(
                newEnd.input, start.object, start.output, this);
        }

        $(end.element).data("mwEdgeInput", null);
        $(newEnd.element).data("mwEdgeInput", this);
        end = newEnd;

        this.update();
    };

    this.getStart = function () {
        return start;
    };

    this.getEnd = function () {
        return end;
    };

    var init = function () {
        graph = spec.graph;

        path = document.createElementNS(mwGraphr.SVG_NS, "path");
        path.style.stroke = "#000";
        path.style.stroke_width = 3;
        path.style.fill = "none";
        graph.getSvg().appendChild(path);

        start = spec.start;
        start.element = (start.element
                         || start.object.getOutputElement(start.output));
        
        end = spec.end;
        end.element = (end.element
                       || end.object.getInputElement(end.input));

        that.setStart(start);
        that.setEnd(end);
    };
    init();
}

$(mwGraphr.init);



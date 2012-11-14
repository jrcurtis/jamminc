
var graphr = {};

graphr.SVG_NS = "http://www.w3.org/2000/svg";

graphr.randomColor = function () {
    var color = '#';
    for (var i = 0; i < 3; i++) {
        color += Math.floor(256 * Math.random()).toString(16);
    }
    return color;
};

graphr.init = function () {
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

graphr.nodeCategories = { "": "#FAA" };

graphr.addNodeCategory = function (category, color) {
    graphr.nodeCategories[category] = color;
};

// spec: {
//    name: type name,
//    inputs: list of inputs accepted
//    outputs: list of outputs produced
//    widget: a widget to appear in the node
//    evaluate: a function to produce the outputs given the inputs
// }
graphr.makeNodeType = function (spec) {
    return {
        name: spec.name,
        category: spec.category || "",
        inputs: spec.inputs || [],
        outputs: spec.outputs || [],
        widget: spec.widget || null,
        evaluate: spec.evaluate || function () {},
        terminal: spec.inputs && !spec.outputs
    };
};

graphr.makeOutput = function (displayName, name) {
    return {
        displayName: displayName,
        name: name
    };
};

graphr.makeInput = function (displayName, name, defaultValue, widget) {
    return {
        displayName: displayName,
        name: name,
        defaultValue: defaultValue,
        widget: widget
    };
};

// Arguments:
//     spec.placement: the DOM element to place the graph in
graphr.Graph = function (spec) {
    var that = this;
    var id, width, height, graphSize, uiContainer, element, svgElement, selectionElement,
        scrollContainer, navigationMenu;
    var nodes, nodeTypes, terminalNodeType, terminalNode;

    var navigateTo = function (id) {
        if (id.getId !== undefined) {
            id = id.getId();
        }

        var position = $(nodes[id].getElement()).position();
        position.left -= width / 2;
        position.top -= height / 2;
        $(scrollContainer)
            .scrollLeft(position.left)
            .scrollTop(position.top);
    };

    var makeNavigationMenu = function () {
        navigationMenu = document.createElement("select");
        $(navigationMenu)
            .change(function (event) {
                $(this)
                    .find("option:selected")
                    .each(function (i, option) {
                        if (option.value) {
                            navigateTo(option.value);
                        }
                    });

                this.selectedIndex = 0;
            })
            .append($(document.createElement("option"))
                    .append("--- Navigate ---"))
            .get(0);
    };

    var addNavigationOption = function (node) {
        $(navigationMenu)
            .append($(document.createElement("option"))
                    .append(node.getType().name)
                    .attr("value", node.getId())
                   );
    };

    var makeNodeSelection = function () {
        selectionElement = document.createElement("ul");
        selectionElement.setAttribute("class", "graph-node-selection");
    };

    var addSelectionElements = function () {
        var makeHelper = function (type) {
            return function () {
                var tempNode = new graphr.GraphNode({type: type});
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
                    appendTo: 'body'
                });
                
        };
    };

    var makeGraph = function () {
        uiContainer = document.createElement("div");

        scrollContainer = document.createElement("div");
        scrollContainer.style.display = "inline-block";
        scrollContainer.style.overflow = "auto";
        scrollContainer.style.cssFloat = "left";
        uiContainer.appendChild(scrollContainer);
        
        element = document.createElement("div");
        element.setAttribute("class", "graph");
        element.style.position = "relative";
        element.style.width = graphSize + "px";
        element.style.height = graphSize + "px";
        scrollContainer.appendChild(element);

        $(element)
        // Accept nodes being dropped onto the workspace
            .droppable({
                accept: ".graph-node-selection li",
                drop: function (event, ui) {
                    that.addNode(
                        { type: ui.helper.data("mwNodeType") },
                        $(ui.helper).offset());
                }
            })
        // Allow panning around the workspace with the mouse
            .mousedown(function (event) {
                if (event.button !== 0) {
                    return;
                }

                $(this)
                    .data("mwLastMousePos",
                          { x: event.pageX, y: event.pageY })
                    .bind("mousemove", function (event) {
                        var $sc = $(scrollContainer);
                        var lastPos = $(this).data("mwLastMousePos");
                        var x = $sc.scrollLeft() - event.pageX + lastPos.x;
                        var y = $sc.scrollTop() - event.pageY + lastPos.y;
                        $sc
                            .scrollLeft(x)
                            .scrollTop(y);
                        $(this).data("mwLastMousePos",
                                     { x: event.pageX, y: event.pageY });
                    });
            })
            .mouseup(function (event) {
                $(this).unbind("mousemove");
            });

        svgElement = document.createElementNS(graphr.SVG_NS, "svg");
        svgElement.setAttribute("class", "graph-svg");
        svgElement.style.width = graphSize + "px";
        svgElement.style.height = graphSize + "px";
        element.appendChild(svgElement);

        var x, y, i, path;
        for (i = 0; i < graphSize; i += 30) {
            svgElement.appendChild(new svg.Path({
                segments: [
                    new svg.PathSegment({
                        type: "move",
                        end: { x: 0, y: i }
                    }),
                    new svg.PathSegment({
                        type: "linear",
                        end: { x: graphSize, y: i }
                    }),
                    new svg.PathSegment({
                        type: "move",
                        end: { x: i, y: 0 }
                    }),
                    new svg.PathSegment({
                        type: "linear",
                        end: { x: i, y: graphSize }
                    })
                ]
            }).css({ stroke: "#8AF" }).element);
        }

        makeNodeSelection();
        uiContainer.appendChild(selectionElement);

        makeNavigationMenu();
        uiContainer.appendChild(navigationMenu);
        navigationMenu.style.display = "inline";
        navigationMenu.style.cssFloat = "left";

        $(document.createElement("div"))
            .css({
                height: "1px",
                clear: "both"
            })
            .appendTo(uiContainer);

        var handleResize = function () {
            var width = $(window).width();
            var height = $(window).height();
            var selWidth = $(selectionElement).width();
            uiContainer.style.width = width + "px";
            uiContainer.style.height = height + "px";
            scrollContainer.style.width = (width - selWidth - 100) + "px";
            scrollContainer.style.height = (height - 100) + "px";
        };

        $(window).resize(handleResize);
        handleResize();

        $(spec.placement || document.body).append(uiContainer);
    };

    
    this.addNodeTypes = function () {
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i].terminal) {
                terminalNodeType = arguments[i];
                terminalNode = this.addNode({type: terminalNodeType});
                navigateTo(terminalNode);
            }

            nodeTypes[arguments[i].name] = arguments[i];
        }
        addSelectionElements();
    };

    this.addNode = function (nodeSpec, offset) {
        nodeSpec.graph = this;
        var node = new graphr.GraphNode(nodeSpec);
        nodes[node.getId()] = node;

        var $e = $(element);
        var eOffset = $e.offset();
        if (offset === undefined) {
            offset = {
                left: eOffset.left + $e.width() / 2,
                top: eOffset.top + $e.height() / 2
            };
        }

        var nodeElement = node.getElement();
        $(element).append(nodeElement);
        $(nodeElement).offset(offset);
        
        addNavigationOption(node);

        return node;
    };

    this.removeNode = function (node) {
        node._remove();
        this._removeNode(node);
    };

    this._removeNode = function (node) {
        nodes.mwRemove(node);
        $(node.getElement()).detach();
        $(navigationMenu).find("[value=" + node.getId() + "]").detach();
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
                    {
                        id: nodeId,
                        type: nodeTypes[nodeData.type],
                        widget: nodeData.widget
                    },
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

                        edge = new graphr.GraphEdge({
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
        return svgElement;
    };

    this.getId = function () {
        return id;
    };

    var init = function () {
        spec = spec || {};

        if (graphr.Graph.count !== undefined) {
            graphr.Graph.count++;
        } else {
            graphr.Graph.count = 1;
        }

        id = graphr.Graph.count;

        width = spec.width || 800;
        height = spec.height || 600;
        graphSize = spec.graphSize || 3000;

        makeGraph();

        nodeTypes = {};
        nodes = [];
        terminalNodeType = null;
        terminalNode = null;
    };
    init();
};

graphr.GraphNode = function (spec) {
    var that = this;
    var id, graph, type, widget;
    var inputs, outputs, element, inputElements, outputElements;
    this.local = null;

    // Create a list item representing an input
    var inputLi = function (input) {
        var li = document.createElement("li");
        li.textContent = input.displayName;
        inputElements[input.name] = li;

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
                            input: input.name
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
    var outputLi = function (output) {
        var li = document.createElement("li");
        li.textContent = output.displayName;
        outputElements[output.name] = li;

        // Dragging an output creates a new edge that can be dropped onto
        // an input.
        $(li)
            .data("mwEdgeOutputs", [])
            .draggable({
                helper: function () {
                    var helper = document.createElement("div");
                    helper.setAttribute("class", "graph-node-dot");
                    var edge = new graphr.GraphEdge({
                        start: {
                            object: that,
                            output: output.name
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
        element.style.position = "absolute";

        title = document.createElement("div");
        title.setAttribute("class", "graph-node-title");
        title.style.backgroundColor = graphr.nodeCategories[type.category];
        title.textContent = type.name;
        element.appendChild(title);

        if (!type.terminal) {
            close = document.createElement("div");
            close.setAttribute("class", "graph-node-close");
            $(close).click(function () { that.remove(); });
            title.appendChild(close);
        }

        if (type.widget !== null) {
            widget = new type.widget();
            if (spec.widget !== undefined) {
                widget.setValue(spec.widget);
            }
            element.appendChild(widget.getElement());
        }

        inputs = document.createElement("ul");
        inputs.setAttribute("class", "graph-node-inputs");
        for (i = 0; i < type.inputs.length; i++) {
            inputs.appendChild(inputLi(type.inputs[i]));
        }
        element.appendChild(inputs);
        
        outputs = document.createElement("ul");
        outputs.setAttribute("class", "graph-node-outputs");
        for (i = 0; i < type.outputs.length; i++) {
            outputs.appendChild(outputLi(type.outputs[i]));
        }
        element.appendChild(outputs);

        $(element)
            .draggable({
                handle: ".graph-node-title",
                containment: "parent",
                scroll: true,
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
            })
            .mousedown(function (event) {
                event.stopPropagation();
            });

        return element;
    };

    var checkInput = function (input) {
        if (!inputs.hasOwnProperty(input)) {
            throw new Error(type.name + " has no input: " + input);
        }
    };

    var checkOutput = function (output) {
        if (!outputs.hasOwnProperty(output)) {
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
        this._remove();
        graph._removeNode(this);
    };

    this._remove = function () {
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
    };

    this.evaluate = function (global) {
        var inputValues = {}, outputValues;
        var i, inputName, inputType, input;
        if (type.widget !== null) {
            inputValues.widget = widget.getValue();
        } else {
            for (i = 0; i < type.inputs.length; i++) {
                inputName = type.inputs[i].name;
                input = inputs[inputName];
                if (input) {
                    outputValues = input.object.evaluate(global);
                    inputValues[inputName] = outputValues[input.output];
                } else {
                    inputValues[inputName] = type.inputs[i].defaultValue;
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

        if (type.widget !== null) {
            data.widget = widget.getValue();
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

        if (graphr.GraphNode.count !== undefined) {
            graphr.GraphNode.count++;
        } else {
            graphr.GraphNode.count = 1;
        }

        id = spec.id || ('id_' + graphr.GraphNode.count);

        graph = spec.graph;
        type = spec.type;

        widget = null;

        inputs = {};
        for (i = 0; i < type.inputs.length; i++) {
            inputs[type.inputs[i].name] = null;
        }

        outputs = {};
        for (i = 0; i < type.outputs.length; i++) {
            outputs[type.outputs[i].name] = [];
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
graphr.GraphEdge = function (spec) {
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

        path.start = { x: p1.left, y: p1.top };
        path.control = { x: mid, y: p1.top };
        path.control2 = { x: mid, y: p2.top };
        path.end = { x: p2.left, y: p2.top };
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

        path.element.parentNode.removeChild(path.element);
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

        pathSegment = new svg.PathSegment({
            type: "cubic",
            relative: false
        });

        path = new svg.Path({
            segments: [
                new svg.PathSegment({ type: "move" }),
                new svg.PathSegment({ type: "cubic" })
            ]
        });

        path.css({
            stroke: "#000",
            strokeWidth: 1,
            fill: "none"
        });

        graph.getSvg().appendChild(path.element);

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

$(graphr.init);




$(function () {
    var graph = mwGraphr.graph();
    graph.addNodeTypes(
        {
            name: "Sine",
            inputs: [["theta", "Theta"]],
            outputs: [["output", "Output"]],
            evaluate: function (inputs, global) {
                return {
                    output: Math.sin(inputs.theta)
                };
            }
        },
        {
            name: "Add",
            inputs: [["a", "A"], ["b", "B"]],
            outputs: [["sum", "Sum"]],
            evaluate: function (inputs, global) {
                return {
                    sum: inputs.a + inputs.b
                };
            }
        },
        {
            name: "Subtract",
            inputs: [["a", "A"], ["b", "B"]],
            outputs: [["difference", "Difference"]],
            evaluate: function (inputs, global) {
                return {
                    difference: inputs.a - inputs.b
                };
            }
        },
        {
            name: "Divide",
            inputs: [["num", "Numerator"], ["denom", "Denominator"]],
            outputs: [["quot", "Quotient"]],
            evaluate: function (inputs, global) {
                return {
                    quot: inputs.num / inputs.denom
                };
            }
        },
        {
            name: "Number",
            outputs: [["num", "Number"]],
            widget: function () {
                var element = document.createElement("input");
                element.setAttribute("type", "text");
                return element;
            },
            evaluate: function (inputs, global) {
                return {
                    num: parseFloat(inputs.widget.value)
                };
            }
        },
        {
            name: "Answer",
            terminal: true,
            inputs: [["answer", "Answer"]],
            evaluate: function (inputs, global) {
                alert("The math is " + inputs.answer);
            }
        }
    );

    var evalButton = document.createElement("input");
    evalButton.setAttribute("type", "button");
    evalButton.setAttribute("value", "Evaluate me");
    $(evalButton).click(function () { graph.evaluate({}); });
    $(document.body).append(evalButton);
});




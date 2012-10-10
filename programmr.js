
var codeNode = function (spec) {
    var that = {};
    var i;

    var name = spec.name;
    var inputs_list = spec.inputs || [];
    var inputs = {};
    for (i = 0; i < inputs_list.length; ++i) {
        inputs[inputs_list[i]] = null;
    }

    var evaluate = (spec.evaluate ||
                    function () { return null; });

    var _evaluate = function (output) {
        var evaluated_inputs = {};
        var input;
        for (input in inputs) {
            if (inputs.hasOwnProperty(input)) {
                evaluated_inputs[input] = inputs[input].evaluate();
            }
        }
        return evaluate(evaluated_inputs, output);
    };
    that.evaluate = _evaluate;

    var connect = function (input, node, output) {
        inputs[input] = {'node': node, 'output': output};
    };
    that.connect = connect;

    return that;
};

var addNode = codeNode({
    'name': 'Add',
    'inputs': ['first', 'second'],
    'evaluate': function (inputs, output) {
        if (output == 'sum') {
            return input.first + input.second;
        }
    }
});





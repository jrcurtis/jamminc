
jamminc = {};

jamminc.makeWaveform = function (name, func) {
    return {
        name: name,
        inputs: [["freq", "Frequency"], ["amp", "Amplitude"],
                 ["phase", "Phase"]],
        outputs: [["signal", "Signal"]],
        evaluate: function (inputs, global) {
            return {
                signal: inputs.amp
                    * func(global.time * inputs.freq - inputs.phase)
            };
        }
    };
};

jamminc.fmod = function (n, d) {
    return n - Math.floor(n / d) * d;
};

$(function () {
    var graph = mwGraphr.graph({
        placement: document.getElementById("music-ui")
    });

    graph.addNodeTypes(
        jamminc.makeWaveform(
            "Sine", function (x) { return Math.sin(2 * Math.PI * x); }),
        jamminc.makeWaveform(
            "Square", function (x) { return -1 + 2 * (x / 2 & 1); }),
        jamminc.makeWaveform(
            "Saw", function (x) { return 2 * jamminc.fmod(x, 1) - 1; }),
        jamminc.makeWaveform(
            "Triangle",
            function (x) { return Math.abs(4 * jamminc.fmod(x, 1) - 2) - 1; }),
        jamminc.makeWaveform(
            "Noise", function (x) { return 2 * Math.random() - 1; }),
        {
            name: "Low pass",
            inputs: [["signal", "Signal"], ["cutoff", "Cutoff"],
                     ["res", "Resonance"]],
            outputs: [["signal", "Signal"]],
            evaluate: function (inputs, global, local) {
                // Moog VCF low pass filter from
                // http://musicdsp.org/showArchiveComment.php?ArchiveID=24
                var f = 2 * inputs.cutoff / global.wav.getSampleRate();
                var p = f * (1.8 - 0.8 * f);
                var k = 2 * p - 1;;
                var t = (1 - p) * 1.386249;
                var t2 = 12 + t * t;
                var r = inputs.res * (t2 + 6 * t) / (t2 - 6 * t);

                if (local.oldY === undefined) {
                    local.oldY = [0, 0, 0, 0];
                }
                if (local.oldX === undefined) {
                    local.oldX = 0;
                }

                var x = inputs.signal - r * local.oldY[3];
                var y = [];
                y[0] = x * p + local.oldX * p - k * local.oldY[0];
                y[1] = y[0] * p + local.oldY[0] * p - k * local.oldY[1];
                y[2] = y[1] * p + local.oldY[1] * p - k * local.oldY[2];
                y[3] = y[2] * p + local.oldY[2] * p - k * local.oldY[3];

                y[3] -= (y[3] * y[3] * y[3]) / 6;
                local.oldX = x;
                local.oldY = y;

                return {
                    signal: y[3]
                };
            }
        },
        {
            name: "Add",
            inputs: [["signal1", "Signal 1"], ["signal2", "Signal 2"]],
            outputs: [["signal", "Signal"]],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal1 + inputs.signal2
                };
            }
        },
        {
            name: "Multiply",
            inputs: [["signal1", "Signal 1"], ["signal2", "Signal 2"]],
            outputs: [["signal", "Signal"]],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal1 * inputs.signal2
                };
            }
        },
        {
            name: "Translate",
            inputs: [["signal", "Signal"], ["min", "Minimum"],
                     ["max", "Maximum"]],
            outputs: [["signal", "Signal"]],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal
                        * (inputs.max - inputs.min) / 2
                        + inputs.min
                };
            }
        },
        {
            name: "Envelope",
            inputs: [["attack", "Attack"], ["decay", "Decay"],
                     ["sustain", "Sustain"], ["release", "Release"]],
            outputs: [["signal", "Signal"]],
            evaluate: function (inputs, global) {
                var output, time;
                if (global.time < inputs.attack) {
                    output = global.time / inputs.attack;
                } else if (global.time < inputs.attack + inputs.decay) {
                    time = global.time - inputs.attack;
                    output = (inputs.sustain - 1)
                        * (time / inputs.decay) + 1;
                } else {
                    output = inputs.sustain;
                }

                return {
                    signal: output
                };
            }
        },
        {
            name: "Number",
            outputs: [["num", "Number"]],
            widget: function () {
                var element = document.createElement("input");
                element.setAttribute("type", "text");
                element.style.width = "50px";
                return element;
            },
            evaluate: function (inputs, global) {
                return {
                    num: parseFloat(inputs.widget.value)
                };
            }
        },
        {
            name: "Input",
            outputs: [["note", "Note"]],
            evaluate: function (inputs, global) {
                return {
                    note: global.note
                };
            }
        },
        {
            name: "Output",
            terminal: true,
            inputs: [["output", "Output"]],
            evaluate: function (inputs, global) {
                return inputs.output;
            }
        }
    );

    $("#generate-music").click(function (event) {
        var line, lines = document.getElementById("notes").value.split("\n");
        var notes = [];
        var i;
        for (i = 0; i < lines.length; i++) {
            line = lines[i].split(" ");
            notes.push([parseFloat(line[0]), parseFloat(line[1])]);
        }

        var wav = mwWav.wav();
        var global = {};
        global.time = 0;
        global.sample = 0;
        global.lastSample = 0;
        global.wav = wav;
        global.output = [];

        graph.initEval();
        var sample, note_time = 0;
        i = 0;
        while (i < notes.length) {
            global.note = notes[i][0];
            note_time += 1 / wav.getSampleRate();
            if (note_time > notes[i][1]) {
                note_time = 0;
                i++;
            }

            sample = graph.evaluate(global);
            global.output.push(sample);
            global.lastSample = sample;
            global.sample++;
            global.time = global.sample / wav.getSampleRate();
        }
        graph.haltEval();

        wav.write([global.output]);
        var audio = document.getElementById("music-audio");
        audio.setAttribute("src", wav.getDataURI());
        audio.play();
    });

    $("#generate-json").click(function (event) {
        $("#json-field").attr("value", graph.serialize());
    });

    $("#load-json").click(function (event) {
        graph.deserialize($("#json-field").attr("value"));
    });
});


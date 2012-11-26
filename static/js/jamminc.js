
jamminc = {};

jamminc.fmod = function (n, d) {
    return n - Math.floor(n / d) * d;
};

jamminc.TextWidget = function () {
    this.element = $(document.createElement("input"))
        .attr("type", "text")
        .css({ width: "50px" })
        .get(0);

    this.getElement = function () {
        return this.element;
    };
    
    this.getValue = function () {
        return parseFloat(this.element.value);
    };

    this.setValue = function (value) {
        this.element.value = value;
    };
};

// Spec: {
//    x: input sample,
//    oldX: last output,
//    oldY: last coefficients,
//    cutoff: cutoff frequency,
//    resonance: amount of resonance 0-1
//    rate: sampling rate
// }
jamminc.lowPassFilter = function (spec) {
    // Moog VCF low pass filter from
    // http://musicdsp.org/showArchiveComment.php?ArchiveID=24
    var f = 2 * spec.cutoff / spec.rate;
    var p = f * (1.8 - 0.8 * f);
    var k = 2 * p - 1;;
    var t = (1 - p) * 1.386249;
    var t2 = 12 + t * t;
    var r = spec.resonance * (t2 + 6 * t) / (t2 - 6 * t);

    var x = spec.x - r * spec.oldY[3];
    var y = [];
    y[0] = x * p + spec.oldX * p - k * spec.oldY[0];
    y[1] = y[0] * p + spec.oldY[0] * p - k * spec.oldY[1];
    y[2] = y[1] * p + spec.oldY[1] * p - k * spec.oldY[2];
    y[3] = y[2] * p + spec.oldY[2] * p - k * spec.oldY[3];

    y[3] -= (y[3] * y[3] * y[3]) / 6;

    return {
        output: y[3],
        oldX: x,
        oldY: y
    };
};

jamminc.makeWaveform = function (name, func) {
    return graphr.makeNodeType({
        name: name,
        inputs: [
            graphr.makeInput("Frequency", "freq", 0, jamminc.TextWidget),
            graphr.makeInput("Amplitude", "amp", 1, jamminc.TextWidget),
            graphr.makeInput("Phase", "phase", 0, jamminc.TextWidget)
        ],
        outputs: [graphr.makeOutput("Signal", "signal")],
        evaluate: function (inputs, global) {
            var omega = global.time * inputs.freq - inputs.phase;
            return {
                signal: inputs.amp * func(omega)
            };
        }
    });
};

$(function () {
    var graph = new graphr.Graph({
        placement: document.getElementById("music-ui")
    });

    var roll = new pianoroll.PianoRoll({
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
        graphr.makeNodeType({
            name: "Noise",
            inputs: [
                graphr.makeInput("Amplitude", "amp", 1, jamminc.TextWidget)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.amp * 2 * Math.random() - 1
                };
            }
        }),
        graphr.makeNodeType({
            name: "Low pass",
            inputs: [
                graphr.makeInput("Signal", "signal", 0, jamminc.TextWidget),
                graphr.makeInput("Cutoff", "cutoff", 20000, jamminc.TextWidget),
                graphr.makeInput("Resonance", "res", 0, jamminc.TextWidget)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global, local) {
                var output = jamminc.lowPassFilter({
                    x: inputs.signal,
                    oldX: local.oldX || 0,
                    oldY: local.oldY || [0, 0, 0, 0],
                    cutoff: inputs.cutoff,
                    resonance: inputs.res,
                    rate: global.wav.getSampleRate()
                });

                local.oldX = output.oldX;
                local.oldY = output.oldY;

                return {
                    signal: output.output
                };
            }
        }),
        graphr.makeNodeType({
            name: "Add",
            inputs: [
                graphr.makeInput("Signal 1", "signal1", 0),
                graphr.makeInput("Signal 2", "signal2", 0)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal1 + inputs.signal2
                };
            }
        }),
        graphr.makeNodeType({
            name: "Multiply",
            inputs: [
                graphr.makeInput("Signal 1", "signal1", 0),
                graphr.makeInput("Signal 2", "signal2", 0)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal1 * inputs.signal2
                };
            }
        }),
        graphr.makeNodeType({
            name: "Translate",
            inputs: [
                graphr.makeInput("Signal", "signal", 0),
                graphr.makeInput("Minimum", "min", -1, jamminc.TextWidget),
                graphr.makeInput("Maximum", "max", 1, jamminc.TextWidget)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global) {
                return {
                    signal: inputs.signal
                        * (inputs.max - inputs.min) / 2
                        + inputs.min
                };
            }
        }),
        graphr.makeNodeType({
            name: "Envelope",
            inputs: [
                graphr.makeInput("Attack", "attack", 0, jamminc.TextWidget),
                graphr.makeInput("Decay", "decay", 0, jamminc.TextWidget),
                graphr.makeInput("Sustain", "sustain", 1, jamminc.TextWidget),
                graphr.makeInput("Release", "release", 0, jamminc.TextWidget)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
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
        }),
        graphr.makeNodeType({
            name: "Delay",
            inputs: [
                graphr.makeInput("Signal", "signal", 0),
                graphr.makeInput("Delay", "delay", 0)
            ],
            outputs: [graphr.makeOutput("Signal", "signal")],
            evaluate: function (inputs, global, local) {
                local.buffer = local.buffer || [];
                local.index = local.index || 0;
                local.buffer[local.index] = inputs.signal;

                var samples = Math.floor(
                    inputs.delay * global.wav.getSampleRate());
                var nextIndex = (local.index + 1) % samples;
                var output = 0;
                if (samples <= local.buffer.length) {
                    output = local.buffer[nextIndex];
                }

                local.index = nextIndex;

                return {
                    signal: output
                };
            }
        }),
        graphr.makeNodeType({
            name: "Number",
            outputs: [graphr.makeOutput("Number", "num")],
            widget: jamminc.TextWidget,
            evaluate: function (inputs, global) {
                return {
                    num: inputs.widget
                };
            }
        }),
        graphr.makeNodeType({
            name: "Input",
            outputs: [
                graphr.makeOutput("Note", "note"),
                graphr.makeOutput("Feedback", "feedback")
            ],
            evaluate: function (inputs, global) {
                return {
                    note: global.note,
                    feedback: global.lastSample
                };
            }
        }),
        graphr.makeNodeType({
            name: "Output",
            inputs: [
                graphr.makeInput("Output", "output", 0, jamminc.TextWidget)
            ],
            evaluate: function (inputs, global) {
                return inputs.output;
            }
        })
    );

    graph.deserialize('{"nodes":{"id_1":{"offset":{"top":373,"left":617},"type":"Output","inputs":{"output":{"object":"id_3","output":"signal"}},"outputs":{}},"id_3":{"offset":{"top":373,"left":439},"type":"Sine","inputs":{"freq":{"object":"id_9","output":"note"},"amp":{"object":"id_5","output":"num"},"phase":{"object":"id_7","output":"num"}},"outputs":{"signal":[{"object":"id_1","input":"output"}]}},"id_5":{"offset":{"top":402,"left":251},"type":"Number","inputs":{},"outputs":{"num":[{"object":"id_3","input":"amp"}]},"widget":0.2},"id_7":{"offset":{"top":455,"left":253},"type":"Number","inputs":{},"outputs":{"num":[{"object":"id_3","input":"phase"}]},"widget":0},"id_9":{"offset":{"top":331,"left":294},"type":"Input","inputs":{},"outputs":{"note":[{"object":"id_3","input":"freq"}]}}}}');

    $("#generate-music").click(function (event) {
        var notes = roll.getNotes();
        var i, time, maxTime = 0;
        for (i = 0; i < notes.length; i++) {
            time = notes[i].time + notes[i].duration;
            if (time > maxTime) {
                maxTime = time;
            }
        }

        var output = [];
        var wav = new mwWAV.WAV();
        var global = {};
        global.time = 0;
        global.sampleI = 0;
        global.lastSample = 0;
        global.wav = wav;
        global.output = [];

        for (i = 0; i < wav.getSampleRate() * maxTime; i++) {
            output[i] = 0;
        }

        graph.initEval();
        var noteI, sample, sampleI, note_time = 0;
        for (noteI = 0; noteI < notes.length; noteI++) {
            global.lastSample = 0;
            global.output = [];
            global.note = music.midiToFrequency(notes[noteI].pitch);
            global.time = 0;
            sampleI = Math.floor(notes[noteI].time * wav.getSampleRate());

            for (i = 0; i < notes[noteI].duration * wav.getSampleRate(); i++) {
                global.sampleI = sampleI + i;
                sample = graph.evaluate(global);
                global.output.push(sample);
                output[global.sampleI] += sample;
                global.lastSample = sample;
                global.time = i / wav.getSampleRate();
            }
        }
        graph.haltEval();

        wav.write([output]);
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


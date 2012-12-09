
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

jamminc.nodeTypes = [
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
];

jamminc.defaultInstrument = '{"nodes":{"id_1":{"offset":{"top":1481,"left":2895},"type":"Output","inputs":{"output":{"object":"id_5","output":"signal"}},"outputs":{}},"id_5":{"offset":{"top":1476.5,"left":2695},"type":"Sine","inputs":{"freq":{"object":"id_7","output":"note"},"amp":{"object":"id_9","output":"num"}},"outputs":{"signal":[{"object":"id_1","input":"output"}]}},"id_7":{"offset":{"top":1433.5,"left":2532},"type":"Input","inputs":{},"outputs":{"note":[{"object":"id_5","input":"freq"}]}},"id_9":{"offset":{"top":1504.5,"left":2491},"type":"Number","inputs":{},"outputs":{"num":[{"object":"id_5","input":"amp"}]},"widget":0.2}}}';

// spec.inst_id = instrument id to describe
// spec.song_id = song id to describe
// (these are mutually exclusive)
// spec.field = "image" | "description"
jamminc.ItemForm = function (spec) {
    var that = this;

    var API_URL = "";
    var song_id, inst_id, field;
    var element, closeButton, showButton, elementBody, form;

    Object.defineProperties(this, {
        song_id: {
            get: function () { return song_id; },
            set: function (id) {
                song_id = id;
                inst_id = null;
                textArea.value = '';
            }
        },
        inst_id: {
            get: function () { return inst_id; },
            set: function (id) {
                inst_id = id;
                song_id = null;
                textArea.value = '';
            }
        },
        showButton: {
            get: function () { return showButton; }
        }
    });

    var makeUI = function () {
        elementBody = document.createElement("div");
        
        closeButton = document.createElement("div");
        $(closeButton)
            .attr("class", "close")
            .click(function () {
                $(element).fadeOut();
            });

        element = document.createElement("div");
        $(element)
            .attr("class", "floating-box")
            .css({ display: "none" })
            .append(closeButton,
                    "<h3>" + mw.capitalize(field) + "</h3>",
                    elementBody)
            .appendTo(document.body);

        showButton = document.createElement("a");
        $(showButton)
            .attr({ href: "#" })
            .text("Edit " + field)
            .click(function () {
                that.show();
                return false;
            });
    };

    var setForm = function (formHTML) {
        $(elementBody).html(formHTML);
        form = $(elementBody).children().get(0);
        $(form).submit(function () {
            save();
            return false;
        });
        
    };

    var save = function () {
        var data = new FormData(form);
        data.append("song_id", song_id);
        data.append("inst_id", inst_id);

        $.ajax({
            url: API_URL,
            type: "POST",
            data: data,
            processData: false,
            contentType: false,
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't save " + field + ": " + data.error);
                    setForm(data.form);
                } else {
                    form = null;
                    $(elementBody).empty();
                    $(element).fadeOut();
                    mw.flash(mw.capitalize(field) + " saved");
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                mw.flash("Couldn't save " + field + ": Server error");
            }
        });
    };

    this.show = function () {
        if (!form) {
            $.ajax({
                url: API_URL,
                type: "GET",
                data: { song_id: song_id, inst_id: inst_id },
                success: function (data, textStatus, jqXHR) {
                    setForm(data.form);
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    mw.flash("Couldn't load " + field + " form");
                }
            });
        }

        $(element).fadeIn();
    };
        
    var init = function () {
        if (spec.song_id) {
            song_id = spec.song_id;
        } else if (spec.inst_id) {
            inst_id = spec.inst_id;
        }

        if (spec.field == "description") {
            field = spec.field;
            API_URL = "/jamminc/music/description.json";
        } else if (spec.field == "image") {
            field = spec.field;
            API_URL = "/jamminc/music/image.json";
        }

        makeUI();
    };
    init();
};

// spec.inst_id, spec.song_id you know the drill
jamminc.AudioUpload = function (spec) {
    spec = spec || {};
    var that = this;

    var song_id, inst_id;
    var uploadButton;

    Object.defineProperties(this, {
        uploadButton: {
            get: function () { return uploadButton; }
        }
    });

    var init = function () {
        if (spec.song_id) {
            song_id = spec.song_id;
        } else if (spec.inst_id) {
            inst_id = spec.inst_id;
        }

        uploadButton = document.createElement("a");
        $(uploadButton)
            .text("Upload audio")
            .attr({ href: "#" })
            .click(function () {
                var wav = $("#music-audio").data("jammincWAV");
                if (!wav) {
                    mw.flash("You need to generate some audio first");
                    return false;
                }

                var data = new FormData();
                data.append("song_id", song_id);
                data.append("inst_id", inst_id);
                data.append("audio", new Blob([wav], { type: "audio/wav" }));

                $.ajax({
                    url: "/jamminc/music/audio.json",
                    type: "POST",
                    data: data,
                    processData: false,
                    contentType: false,
                    success: function (data, textStatus, jqXHR) {
                        if (data.error) {
                            mw.flash("Couldn't save audio : " + data.error);
                        } else {
                            mw.flash("Audio saved");
                        }
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        mw.flash("Couldn't save audio: Server error");
                    }
                });

                return false;
            });
    };
    init();
};

// spec.id = id of existing instrument to load
jamminc.Instrument = function (spec) {
    spec = spec || {};
    var that = this;


    var API_URL = "/jamminc/music/instruments.json";
    var id, local, ready;
    var graph, nameInput, description, image, audioUpload;

    Object.defineProperties(this, {
        id: {
            get: function () { return id; }
        },
        element: {
            get: function () { return graph.getElement(); }
        },
        graph: {
            get: function () { return graph; }
        },
        ready: {
            get: function () { return ready; }
        },
        nameInput: {
            get: function () { return nameInput; }
        }
    });

    var makeUpdaters = function () {
        description = new jamminc.ItemForm({
            inst_id: id,
            field: "description"
        });
        image = new jamminc.ItemForm({
            inst_id: id,
            field: "image"
        });
        audioUpload = new jamminc.AudioUpload({
            inst_id: id
        });
    };

    this.place = function () {
        var buttons = '';
        if (description && image && audioUpload) {
            buttons = mw.makeList([
                description.showButton,
                image.showButton,
                audioUpload.uploadButton
            ]);
            $(buttons).attr("class", "button-group");
        }

        $("#instrument-ui")
            .empty()
            .append(nameInput,
                    buttons,
                    document.createElement("br"),
                    graph.getElement());
        graph.update();
    };

    this.create = function () {
        $.ajax({
            url: API_URL,
            type: "POST",
            data: {
                name: that.name,
                data: graph.serialize()
            },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Instrument couldn't be created: " + data.error);
                } else {
                    local = false;
                    id = data.id;
                    makeUpdaters();
                    that.place();
                    mw.flash("New instrument created");
                }

                $(that).triggerHandler(
                    "save", { success: data.error === undefined });
            }
        });
    };

    this.load = function () {
        $.ajax({
            url: API_URL,
            type: "GET",
            data: { id: id },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't load instrument: " + data.error);
                } else {
                    ready = true;
                    that.name = data.name;
                    graph.deserialize(data.data);
                    graph.update();
                }

                $(that).triggerHandler("ready", { success: ready });
            }
        });
    };

    this.save = function () {
        if (local) {
            that.create();
            return;
        }

        $.ajax({
            url: API_URL,
            type: "PUT",
            data: {
                id: id,
                name: that.name,
                data: graph.serialize()
            },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't save instrument: " + data.error);
                } else {
                    mw.flash("Instrument saved");
                }

                $(that).triggerHandler(
                    "save", { success: data.error === undefined });
            }
        });
    };

    this._delete = function () {
        if (local) {
            return;
        }

        $.ajax({
            url: API_URL + "?" + $.param({ id: id }),
            type: "DELETE",
            success: function (data, textStatus, jqXHR) {
                mw.flash("Instrument deleted");
            }
        });
    };

    var init = function () {
        graph = new graphr.Graph({ nodeTypes: jamminc.nodeTypes });
        nameInput = document.createElement("input");
        $(nameInput)
            .attr("type", "text");

        mw.synchronize(that, {
            name: nameInput
        });

        local = false;
        ready = false;
        id = spec.id || 0;
        that.name = "My dope instrument";

        if (id) {
            that.load();
            makeUpdaters();
        } else {
            local = true;
            ready = true;
            graph.deserialize(jamminc.defaultInstrument);
        }
    };
    init();
};

// spec.song = song this track belongs to
// spec.id = id of existing track to load
jamminc.Track = function (spec) {
    spec = spec || {};
    var that = this;

    var API_URL = "/jamminc/music/tracks.json";
    var id, local;
    var song, roll;

    Object.defineProperties(this, {
        id: {
            get: function () { return id; }
        },
        roll: {
            get: function () { return roll; }
        },
        element: {
            get: function () { return roll.element; }
        }
    });

    this.generateAudio = function (instrument, wav) {
        var notes = roll.getNotes();
        var graph = instrument.graph;
        var global = {};
        var sr = wav.getSampleRate();
        var volume = roll.volume;
        var pan = roll.pan;
        var panLeft = pan < 0.5 ? 1 : -2 * pan + 2;
        var panRight = pan > 0.5 ? 1 : 2 * pan;

        global.time = 0;
        global.sampleI = 0;
        global.lastSample = 0;
        global.wav = wav;

        var noteI, sample, sampleI, i;
        for (noteI = 0; noteI < notes.length; noteI++) {
            global.lastSample = 0;
            global.output = [];
            global.note = music.midiToFrequency(notes[noteI].pitch);
            global.time = 0;
            sampleI = Math.floor(notes[noteI].time * sr);

            graph.initEval();
            for (i = 0; i < notes[noteI].duration * sr; i++) {
                global.sampleI = sampleI + i;
                sample = volume * graph.evaluate(global);
                global.output.push(sample);
                global.lastSample = sample;
                global.time = i / sr;
            }
            graph.haltEval();

            wav.write(
                [global.output.map(function (s) { return s * panLeft }),
                 global.output.map(function (s) { return s * panRight })],
                sampleI);
        }
    };

    this.create = function () {
        $.ajax({
            url: API_URL,
            type: "POST",
            data: {
                song_id: song.id,
                name: roll.trackName,
                data: roll.serialize(),
                inst_id: roll.instrument
            },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Track couldn't be created: " + data.error);
                } else {
                    local = false;
                    id = data.id;
                    mw.flash("New track created");
                }
            }
        });
    };

    this.load = function () {
        $.ajax({
            url: API_URL,
            type: "GET",
            data: { id: id },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't load track: " + data.error);
                } else {
                    name = data.name;
                    roll.name = data.name;
                    roll.deserialize(data.data);
                    roll.update();
                }
            }
        });
    };

    this.save = function () {
        if (local) {
            that.create();
            return;
        }

        $.ajax({
            url: API_URL,
            type: "PUT",
            data: {
                id: id,
                name: roll.trackName,
                data: roll.serialize(),
                inst_id: roll.instrument
            },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't save track: " + data.error);
                } else {
                    mw.flash("Track saved");
                }
            }
        });
    };

    this._delete = function () {
        if (local) {
            return;
        }

        $.ajax({
            url: API_URL + "?" + $.param({ id: id }),
            type: "DELETE",
            success: function (data, textStatus, jqXHR) {
                mw.flash("Track deleted");
            }
        });
    };

    var init = function () {
        roll = new pianoroll.PianoRoll();

        song = spec.song;
        local = false;
        id = spec.id || 0;
        
        if (id) {
            that.load();
        } else {
            local = true;
        }
    };
    init();
};

// spec.id = id of existing song to load
jamminc.Song = function (spec) {
    spec = spec || {};
    var that = this;

    var API_URL = "/jamminc/music/songs.json";
    var id, local;
    var tracks, instruments, description, image, audioUpload;

    Object.defineProperties(this, {
        id: {
            get: function () { return id; }
        },
        instruments: {
            get: function () { return instruments; },
            set: function (is) {
                instruments = is;
                var i;
                for (i = 0; i < tracks.length; i++) {
                    tracks[i].roll.instruments = instruments;
                }
            }
        },
    });

    mw.synchronize(this, {
        name: $("#song-name").get(0)
    });

    var makeUpdaters = function () {
        description = new jamminc.ItemForm({
            song_id: id,
            field: "description"
        });
        image = new jamminc.ItemForm({
            song_id: id,
            field: "image"
        });
        audioUpload = new jamminc.AudioUpload({
            song_id: id
        });
        var buttons = mw.makeList([
            description.showButton,
            image.showButton,
            audioUpload.uploadButton
        ]);
        $(buttons).attr("class", "button-group");
        $("#song-name").after(buttons);
    };

    this.generateAudio = function (handler) {
        tracks.sort(function (t1, t2) {
            return (mw.cmp(jamminc.instrumentManager.isLoaded(t2.id),
                           jamminc.instrumentManager.isLoaded(t1.id))
                    || mw.cmp(t1.roll.instrument, t2.roll.instrument));
        });

        var wav = new mwWAV.WAV({ channels: 2 });
        var trackI = 0;

        var gen = function () {
            if (trackI >= tracks.length) {
                handler(wav);
                return;
            }

            var track = tracks[trackI];
            var instId = track.roll.instrument;
            var inst = jamminc.instrumentManager.get(instId);

            var genTrack = function () {
                $(inst).off("ready.jammincSong");
                track.generateAudio(inst, wav);
                trackI++;
                gen();
            };

            if (inst.ready) {
                genTrack();
            } else {
                $(inst).on("ready.jammincSong", genTrack);
            }
        };

        gen();
    };

    this.addTrack = function (id) {
        var track = new jamminc.Track({ song: that, id: id });
        track.roll.instruments = instruments;
        tracks.push(track);

        var li = document.createElement("li");
        $(li)
            .append(track.element)
            .appendTo("#tracks-ui");
        track.roll.update();

        $(track.roll).on("remove.jammincSong", function () {
            track._delete();
            $(li).fadeOut();
            mw.arrayRemove(tracks, track);
        });
    };

    this.create = function () {
        $.ajax({
            url: API_URL,
            type: "POST",
            data: { name: that.name },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Song couldn't be created: " + data.error);
                } else {
                    local = false;
                    id = data.id;
                    makeUpdaters();
                    mw.flash("New song created");
                    that.save();
                }
            }
        });
    };

    this.load = function () {
        $.ajax({
            url: API_URL,
            type: "GET",
            data: { id: id },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't load song: " + data.error);
                } else {
                    that.name = data.name;
                    var i;
                    for (i = 0; i < data.tracks.length; i++) {
                        that.addTrack(data.tracks[i]);
                    }
                    $("#instrument-name").text(data.name);
                }
            }
        });
    };

    this.save = function () {
        if (local) {
            that.create();
            return;
        }

        var i;
        for (i = 0; i < tracks.length; i++) {
            tracks[i].save();
        }

        $.ajax({
            url: API_URL,
            type: "PUT",
            data: { id: id, name: that.name },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't save song: " + data.error);
                } else {
                    mw.flash("Song saved");
                }
            }
        });
    };

    this._delete = function () {
        if (local) {
            return;
        }

        $.ajax({
            url: API_URL + "?" + $.param({ id: id }),
            type: "DELETE",
            success: function (data, textStatus, jqXHR) {
                mw.flash("Song deleted");
            }
        });
    };

    var init = function () {
        local = false;
        id = spec.id || 0;
        that.name = "My Song";
        tracks = [];

        if (spec.id) {
            that.load();
            makeUpdaters();
        } else {
            local = true;
        }

    };
    init();
};

jamminc.InstrumentManager = function (spec) {
    spec = spec || {};
    var that = this;

    var instruments, localInstrument, currentInstrument, instrumentIndex;

    this.isLoaded = function (id) {
        var i, inst;
        for (i = 0; i < instruments.length; i++) {
            inst = instruments.at(i);
            if (inst && inst.id == id) {
                return true;
            }
        }
        return false;
    };

    this.load = function (id) {
        var inst = new jamminc.Instrument({ id: id });
        instruments.insert(inst);
        return inst;
    };

    this.get = function (id) {
        if (id === "local") {
            return localInstrument;
        }

        var i, inst;
        for (i = 0; i < instruments.length; i++) {
            inst = instruments.at(i);
            if (inst && inst.id == id) {
                return instruments.at(i);
            }
        }

        return that.load(id);
    };
    
    this.create = function () {
        localInstrument = new jamminc.Instrument();
        that.makeCurrent("local");
        that.updateIndex();
    };

    this.makeCurrent = function (id) {
        if (currentInstrument && (currentInstrument.id == id)) {
            return;
        }

        if (localInstrument && (localInstrument === currentInstrument)) {
            if (confirm("If you load this instrument, your unsaved instrument will be lost!")) {
                localInstrument = null;
                that.updateIndex();
            } else {
                return;
            }
        }

        if (currentInstrument) {
            $(currentInstrument.nameInput).off("change.jammincInstrumentManager");
        }
        currentInstrument = that.get(id);
        currentInstrument.place();
        $(currentInstrument.nameInput)
            .on("change.jammincInstrumentManager", function () {
                that.updateIndex();
            });

        $("#view-instrument").attr("href", "/jamminc/music/view/instruments/" + id);
        $("#fork-instrument").attr("href", "/jamminc/music/edit/instruments/" + id + "?fork=1");
        $("#derived-instruments").attr("href", "/jamminc/music/browse/instruments?derived=" + id);
        $("#instrument-uses").attr("href", "/jamminc/music/browse/songs?use=" + id);
    };

    this.saveCurrent = function () {
        if (localInstrument && (localInstrument === currentInstrument)) {
            $(localInstrument).on(
                "save.jammincInstrumentManager",
                function (e) {
                    $(localInstrument).off("save.jammincInstrumentManager");
                    if (e.success) {
                        instrumentIndex.push(
                            [localInstrument.name, localInstrument.id]);
                        instruments.insert(localInstrument);
                        localInstrument = null;
                        that.updateIndex();
                    }
                });
            }

        if (currentInstrument) {
            currentInstrument.save();
        }
    };

    this.updateIndex = function () {
        var $load_instrument = $("#load-instrument");
        $load_instrument.children().slice(1).detach();
        
        instrumentIndex.forEach(function (inst) {
            $load_instrument.append(
            $(document.createElement("option"))
            .text(inst[0])
            .attr("value", inst[1])
            .get(0));
        });
        
        var local;
        if (jamminc.song) {
            local = localInstrument ? [[localInstrument.name, "local"]] : [];
            jamminc.song.instruments = instrumentIndex.concat(local);
        }
    };

    this.loadInstruments = function () {
        $.ajax({
            url: "/jamminc/music/instruments_list.json",
            type: "GET",
            success: function (data, textStatus, jqXHR) {
                instrumentIndex = data.instruments;
                that.updateIndex();
            }
        });
    };
    
    var init = function () {
        instruments = new mw.CircularBuffer(10);
        localInstrument = null;
        currentInstrument = null;
        instrumentIndex = [];
        that.loadInstruments();
    };
    init();
};

$(function () {
    jamminc.song = null;
    jamminc.instrumentManager = new jamminc.InstrumentManager();
    var id = 0;

    if (id = $("#song-id").text()) {
        if (id === "new") {
            id = null;
        }
        jamminc.song = new jamminc.Song({ id: id });
    } else if (id = $("#inst-id").text()) {
        if (id === "new") {
            jamminc.instrumentManager.create();
        } else {
            jamminc.instrumentManager.makeCurrent(id);
        }
        jamminc.song = new jamminc.Song();
    }

    $("#play-song").click(function (event) {
        if (jamminc.song) {
            jamminc.song.generateAudio(function (wav) {
                var audio = $("#music-audio")
                    .attr("src", wav.getDataURI())
                    .data("jammincWAV", wav.getWav())
                    .get(0);
                audio.play();
            });
        }
        return false;
    });

    $("#new-instrument").click(function (event) {
        jamminc.instrumentManager.create();
        return false;
    });

    $("#load-instrument").change(function (event) {
        if (this.value) {
            jamminc.instrumentManager.makeCurrent(this.value);
        }
        this.selectedIndex = 0;
    });

    $("#save-instrument").click(function () {
        jamminc.instrumentManager.saveCurrent();
        return false;
    });

    $("#new-track").click(function (event) {
        if (jamminc.song) {
            jamminc.song.addTrack();
        }
        return false;
    });

    $("#save-song").click(function () {
        if (jamminc.song) {
            jamminc.song.save();
        }
        return false;
    });

});


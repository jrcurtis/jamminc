
pianoroll = {};

pianoroll.noteIcons = (function () {
    var list = document.createElement("ol");
    $(list).attr("class", "note-icon-list");
    var li, i, name;
    for (i = music.MAX_MIDI_NOTE; i >= 0; i--) {
        name = music.noteName(i);
        if (name === "C") {
            name += i / 12;
        }
        li = document.createElement("li");
        $(li)
            .text(name)
            .appendTo(list);
        if (name.indexOf("#") >= 0) {
            $(li).attr("class", "black-note");
        }
    }
    return list;
})();

// spec.placement = where should this be put?
// spec.instruments = [[inst_name, inst_id], ...]
pianoroll.PianoRoll = function (spec) {
    spec = spec || {};
    var that = this;

    var noteHeight = 20;
    var beatWidth = 20;
    var beatsPerMinute = 120;
    var beatsPerMeasure = 4;
    var notePadding = 3;
    var trackLength = 60;

    var uiContainer, element, svgElement, scrollContainer, scaleContainer;
    var notes, noteElements, noteIcons;
    var instruments;
    var trackNameInput, instrumentSelect, volumeSlider, panSlider;
    var snapping, snapPixels;

    Object.defineProperties(this, {
        element: {
            get: function () { return uiContainer; }
        },
        instruments: {
            get: function () { return instruments; },
            set: function (is) {
                instruments = is;
                mw.fillSelect(instrumentSelect, instruments);
            }
        },
        snapping: {
            get: function () { return snapping; },
            set: function (s) {
                snapping = s;
                snapPixels = snapping == 0 ? 1 : beatWidth * beatsPerMeasure * snapping;

                notes.forEach(function (note) {
                    if (note.element) {
                        $(note.element)
                            .draggable("option", "grid", [snapPixels, noteHeight + notePadding])
                            .resizable("option", "grid", [snapPixels, 0]);
                    }
                });
            }
        }
    });

    var screenToMidiNote = function (y) {
        return music.MAX_MIDI_NOTE - Math.floor(y / (noteHeight + notePadding));
    };

    var midiNoteToScreen = function (midiNote) {
        return (music.MAX_MIDI_NOTE - midiNote)
            * (noteHeight + notePadding);
    };

    var screenToTime = function (x) {
        return x / beatWidth / beatsPerMinute * 60;
    };

    var timeToScreen = function (t) {
        return t / 60 * beatsPerMinute * beatWidth;
    };

    var cmpNote = function (a, b) {
        return mw.cmp(a.pitch, b.pitch) || mw.cmp(a.time, b.time);
    };

    var makeGrid = function () {
        svgElement = document.createElementNS(svg.SVG_NS, "svg");
        svgElement.setAttribute("class", "pianoroll-svg");
        var grid = new svg.Path();
        var n;
        for (n = 0; n < music.MAX_MIDI_NOTE - 1; n++) {
            grid.addSegments(
                new svg.PathSegment({
                    type: "move",
                    relative: false,
                    end: { x: 0, y: n * noteHeight + (n - 0.5) * notePadding }
                }),
                new svg.PathSegment({
                    type: "linear",
                    relative: true,
                    end: { x: timeToScreen(trackLength), y: 0 }
                })
            );
        }
        grid.css({ stroke: "#EEE", strokeWidth: notePadding + "px" });
        svgElement.appendChild(grid.element);
        element.appendChild(svgElement);
    };

    var makeUI = function () {
        element = document.createElement("div");
        $(element)
            .attr("class", "pianoroll")
            .css({
                height: (music.MAX_MIDI_NOTE
                         * (noteHeight + notePadding)) + "px",
                width: timeToScreen(trackLength),
            })
            .click(mw.fixCoords(handleClick));

        trackNameInput = document.createElement("input");
        $(trackNameInput)
            .attr({ type: "text" })
            .css({ width: "90%" })
            .change(function () { trackName = trackNameInput.value; });

        instrumentSelect = mw.makeSelect([]);
        $(instrumentSelect)
            .css({ width: "90%" })
            .change(function () { instrument = instrumentSelect.value; });

        volumeSlider = document.createElement("div");
        $(volumeSlider)
            .slider({
                min: 0,
                max: 1,
                value: 1,
                step: 0.05,
                change: function () {
                    volume = $(volumeSlider).slider("value");
                }
            });

        panSlider = document.createElement("div");
        $(panSlider)
            .slider({
                min: 0,
                max: 1,
                step: 0.05,
                change: function () {
                    pan = $(panSlider).slider("value");
                }
            });

        mw.synchronize(that, {
            trackName: trackNameInput,
            instrument: instrumentSelect,
            volume: volumeSlider,
            pan: panSlider
        });

        var snapSelect = mw.makeSelect([
            ["No snapping", 0],
            ["Whole note", 1],
            ["1/2 note", 1/2],
            ["1/4 note", 1/4],
            ["1/8 note", 1/8]
        ]);
        $(snapSelect)
            .css({ width: "90%" })
            .change(function (event) {
                that.snapping = snapSelect.value;
            });

        var closeButton = $(document.createElement("div"))
            .attr("class", "close")
            .click(function (event) {
                $(that).triggerHandler("remove");
            });

        var settingsTable = mw.makeTable(
            [["Name", trackNameInput],
             ["Instrument", instrumentSelect],
             ["Volume", volumeSlider],
             ["Pan", panSlider],
             ["Snap", snapSelect]],
            [{ textAlign: "right", paddingRight: "10px" },
             { textAlign: "left" }]);

        var settingsWidth = 200;
        var settingsContainer = document.createElement("div");
        $(settingsContainer)
            .attr("class", "pianoroll-settings")
            .css({
                width: settingsWidth,
                cssFloat: "left"
            })
            .append(closeButton, settingsTable);

        scrollContainer = document.createElement("div");
        $(scrollContainer)
            .css({
                overflow: "scroll",
                height: (12 * (noteHeight + notePadding)) + "px",
                position: "relative"
            })
            .append(element)
            .scroll(function (event) {
                var left = $(scrollContainer).scrollLeft();
                var opacity = left > 0 ? 0.5 : 1;
                $(noteIcons)
                    .css({
                        left: left,
                        opacity: opacity
                    });
            });

        noteIcons = $(pianoroll.noteIcons)
            .clone()
            .appendTo(scrollContainer)
            .get(0);

        scaleContainer = document.createElement("div");
        $(scaleContainer)
            .css({ paddingLeft: settingsWidth + 10 })
            .append(scrollContainer);

        uiContainer = document.createElement("div");
        $(uiContainer)
            .append(settingsContainer, scaleContainer);

        makeGrid();

        if (spec.placement) {
            $(spec.placement).append(container);
        }
    };

    var handleClick = function (event) {
        if (event.button !== 0) {
            return;
        }

        var midiNote = screenToMidiNote(event.offsetY);
        var time = screenToTime(event.offsetX);

        currentNote = new pianoroll.Note(midiNote, time, 60 / beatsPerMinute);
        that.addNote(currentNote);
    };

    var handleNoteChange = function (event, ui) {
        var note = $(this).data("pianorollNote");
        note.pitch = screenToMidiNote(ui.position.top);
        note.time = screenToTime(ui.position.left);
        note.duration = screenToTime($(this).width());
    };

    this.addNote = function (note) {
        var top = midiNoteToScreen(note.pitch);
        var left = timeToScreen(note.time);
        var width = timeToScreen(note.duration);

        note.element = document.createElement("div");
        $(note.element)
            .data("pianorollNote", note)
            .attr("class", "music-note")
            .css({
                top: top,
                left: left,
                width: width,
                height: noteHeight - 2,
                position: "absolute"
            })
            .mousedown(function (e) { e.stopPropagation(); })
            .click(function (e) { e.stopPropagation(); })
            .dblclick(function (e) {
                that.removeNote($(this).data("pianorollNote"));
                e.stopPropagation();
            })
            .resizable({
                containment: "parent",
                handles: "w, e",
                resize: handleNoteChange,
                grid: [snapPixels, 0],
                minWidth: beatWidth * beatsPerMeasure / 16,
                start: function (event, ui) {
                    var snapped = snapPixels
                        * Math.round(ui.originalSize.width / snapPixels);
                    ui.originalSize.width = snapped;
                }
            })
            .draggable({
                containment: "parent",
                grid: [snapPixels, noteHeight + notePadding],
                drag: handleNoteChange
            })
            .mousedown(function (event) {
                var snapped = snapPixels
                    * Math.round(parseInt(this.style.left, 10) / snapPixels);
                this.style.left = snapped + "px";
            });

        notes.push(note);
        noteElements.push(note.element);
        $(element).append(note.element);
    };

    this.update = function () {
        var firstNote, i;
        if (notes.length > 0) {
            firstNote = notes[0];
            for (i = 1; i < notes.length; i++) {
                if (notes[i].time < firstNote.time) {
                    firstNote = notes[i];
                }
            }
            $(scrollContainer)
                .scrollTop(midiNoteToScreen(firstNote.pitch)
                           - $(scrollContainer).height() / 2)
                .scrollLeft(timeToScreen(firstNote.time)
                            - beatWidth);
        } else {
            $(scrollContainer).scrollTop($(element).height() / 2);
        }
    };

    this.removeNote = function (note) {
        $(note.element).detach();
        mw.arrayRemove(notes, note);
        mw.arrayRemove(noteElements, note.element);
    };

    this.getNotes = function () {
        var rnotes = [];

        var i;
        for (i = 0; i < notes.length; i++) {
            rnotes.push(notes[i]);
        }

        rnotes.sort(cmpNote);

        return rnotes;
    };

    this.serialize = function () {
        var data = {};

        data.trackName = that.trackName;
        data.instrument = that.instrument;
        data.volume = that.volume;
        data.pan = that.pan;

        data.notes = [];
        var i, note;
        for (i = 0; i < notes.length; i++) {
            note = notes[i];
            data.notes.push({
                pitch: note.pitch,
                time: note.time,
                duration: note.duration
            });
        }

        return JSON.stringify(data);
    };

    this.deserialize = function (data) {
        data = JSON.parse(data);

        that.trackName = data.trackName;
        that.instrument = data.instrument;
        that.volume = data.volume;
        that.pan = data.pan;

        notes = [];
        var i;
        for (i = 0; i < data.notes.length; i++) {
            that.addNote(data.notes[i]);
        }
    };

    var init = function () {
        makeUI();

        notes = [];
        noteElements = [];

        that.instruments = spec.instruments || [];
        that.trackName = "track";
        that.instrument = 1;
        that.volume = 1;
        that.pan = 0;
        that.snapping = 0;
    };
    init();
};

pianoroll.Note = function (midiNote, time, duration) {
    this.pitch = midiNote;
    this.time = time;
    this.duration = duration;
    this.element = null;
};


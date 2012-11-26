
pianoroll = {};

pianoroll.SVG_NS = "http://www.w3.org/2000/svg";

pianoroll.PianoRoll = function (spec) {
    spec = spec || {};
    var that = this;

    var noteHeight = 20;
    var beatWidth = 20;
    var beatsPerMinute = 120;
    var beatsPerMeasure = 4;
    var notePadding = 3;

    var element, svgElement;
    var noteRows, noteElements, currentNote;

    Object.defineProperties(this, {
        element: {
            get: function () { return element; }
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
        if (a.pitch < b.pitch) {
            return -1;
        } else if (a.pitch > b.pitch) {
            return 1;
        } else if (a.time + a.duration < b.time) {
            return -1;
        } else if (a.time > b.time + b.duration) {
            return 1;
        } else {
            return 0;
        }
    };

    var findNote = function (midiNote, time) {
        var tempNote = new pianoroll.Note(midiNote, time, 0);
        
        return mw.arrayBinarySearch(noteRows[midiNote], tempNote, cmpNote);
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
                    end: { x: 1000, y: 0 }
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
                width: timeToScreen(60),
            })
            .click(mw.fixCoords(handleClick));

        var trackName = document.createElement("input");
        $(trackName)
            .attr({
                "type": "text",
                "size": 10
            });
        var instrumentSelect = mw.makeSelect(["inst1", "funky"]);
        var volumeSlider = document.createElement("div");
        $(volumeSlider)
            .slider({
                min: 0,
                max: 1,
                value: 1,
                step: 0.05
            });
        var panSlider = document.createElement("div");
        $(panSlider)
            .slider({
                min: -1,
                max: 1,
                step: 0.1
            });

        var settingsTable = mw.makeTable(
            [["Name", trackName],
             ["Instrument", instrumentSelect],
             ["Volume", volumeSlider],
             ["Pan", panSlider]],
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
            .append(settingsTable);

        var scrollContainer = document.createElement("div");
        $(scrollContainer)
            .css({
                overflow: "scroll",
                height: (12 * (noteHeight + notePadding)) + "px"
            })
            .append(element);

        var scrollContainerContainer = document.createElement("div");
        $(scrollContainerContainer)
            .css({ paddingLeft: settingsWidth + 10 })
            .append(scrollContainer);

        var container = document.createElement("div");
        $(container)
            .append(settingsContainer, scrollContainerContainer);

        makeGrid();

        $(spec.placement || document.body).append(container);
    };

    var handleClick = function (event) {
        if (event.button !== 0) {
            return;
        }

        console.log(event);
        var midiNote = screenToMidiNote(event.offsetY);
        var time = screenToTime(event.offsetX);
        console.log("DWN", "x", event.offsetX, "y", event.offsetY, "note", midiNote, "t", time);

        currentNote = new pianoroll.Note(midiNote, time, 1);
        that.addNote(currentNote);
    };

    var handleNoteChange = function (event, ui) {
        var note = $(this).data("pianorollNote");
        var position = $(this).position();
        note.pitch = screenToMidiNote(position.top);
        note.time = screenToTime(position.left);
        note.duration = screenToTime($(this).width());
    };

    this.addNote = function (note) {
        var top = midiNoteToScreen(note.pitch);
        var left = timeToScreen(note.time);
        var width = timeToScreen(note.duration);
        console.log("ADD", "x", left, "y", top, "note", note.pitch, "t", note.time);

        note.element = $(document.createElement("div"))
            .data("pianorollNote", note)
            .attr("class", "music-note")
            .css({
                top: top,
                left: left,
                width: width,
                height: noteHeight,
                position: "absolute"
            })
            .mousedown(function (e) { e.stopPropagation(); })
            .dblclick(function (e) {
                that.removeNote($(this).data("pianorollNote"));
            })
            .resizable({
                containment: "parent",
                handles: "w, e",
                resize: handleNoteChange
            })
            .draggable({
                containment: "parent",
                grid: [1, noteHeight + notePadding],
                drag: handleNoteChange
            })
            .get(0);

        noteRows[note.pitch].push(note);
        noteElements.push(note.element);
        $(element).append(note.element);
    };

    this.removeNote = function (note) {
        $(note.element).detach();
        mw.arrayRemove(noteRows[note.pitch], note);
        mw.arrayRemove(noteElements, note.element);
    };

    this.getNotes = function () {
        var notes = [];

        var pitch, i;
        for (pitch = 0; pitch < music.MAX_MIDI_NOTE; pitch++) {
            for (i = 0; i < noteRows[pitch].length; i++) {
                notes.push(noteRows[pitch][i]);
            }
        }

        notes.sort(cmpNote);

        return notes;
    };

    var init = function () {
        makeUI();

        noteRows = [];
        var n;
        for (n = 0; n <= music.MAX_MIDI_NOTE; n++) {
            noteRows.push([]);
        }

        noteElements = [];

        currentNote = null;
    };
    init();
};

pianoroll.Note = function (midiNote, time, duration) {
    this.pitch = midiNote;
    this.time = time;
    this.duration = duration;
    this.element = null;
};


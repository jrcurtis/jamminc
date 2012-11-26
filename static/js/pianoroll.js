
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
        return music.MAX_MIDI_NOTE * (noteHeight + notePadding)
            - midiNote * (noteHeight + notePadding);
    };

    var screenToTime = function (x) {
        return x / beatWidth / beatsPerMinute * 60;
    };

    var timeToScreen = function (t) {
        return t / 60 * beatsPerMinute * beatWidth;
    };

    var findNote = function (midiNote, time) {
        var tempNote = new pianoroll.Note(midiNote, time, 0);
        
        var cmpNote = function (a, b) {
            if (a.time + a.duration < b.time) {
                return -1;
            } else if (a.time > b.time + b.duration) {
                return 1;
            } else {
                return 0;
            }
        };

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
                         * (noteHeight + notePadding)) + "px"
            })
            .mousedown(mw.fixCoords(handleMouseDown));

        var settingsContainer = document.createElement("div");
        $(settingsContainer)
            .css({ width: "200px", cssFloat: "left" });

        var scrollContainer = document.createElement("div");
        $(scrollContainer)
            .css({
                overflow: "auto",
                height: (12 * (noteHeight + notePadding)) + "px"
            })
            .append(settingsContainer, element);

        makeGrid();

        $(spec.placement || document.body).append(scrollContainer);
    };

    var handleMouseDown = function (event) {
        console.log(event);
        var midiNote = screenToMidiNote(event.offsetY);
        var time = screenToTime(event.offsetX);
        console.log("DWN", "x", event.offsetX, "y", event.offsetY, "note", midiNote, "t", time);

        currentNote = new pianoroll.Note(midiNote, time, 1);
        that.addNote(currentNote);
    };

    var handleNoteChange = function (event, ui) {
        var note = $(this).data("pianorollNote");
        var offset = $(this).offset();
        note.pitch = screenToMidiNote(offset.top);
        note.time = screenToTime(offset.left);
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


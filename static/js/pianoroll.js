
pianoroll = {};

pianoroll.SVG_NS = "http://www.w3.org/2000/svg";

pianoroll.PianoRoll = function (spec) {
    var that = this;

    var noteHeight = 20;
    var beatWidth = 20;
    var beatsPerMinute = 120;
    var beatsPerMeasure = 4;
    var notePadding = 3;

    var element, svg;
    var noteRows, currentNote;

    Object.defineProperties(this, {
        element: {
            get: function () { return element; }
        }
    });

    var screenToMidiNote = function (y) {

    };

    var midiNoteToScreen = function (midiNote) {

    };

    var screenToTime = function (x) {

    };

    var timeToScreen = function (t) {

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

    var makeUI = function () {
        element = document.createElement("div");
        $(element)
            .attr("class", "pianoroll")
            .mousedown(handleMouseDown)
            .mousemove(handleMouseMove);

        var settingsContainer = document.createElement("div");
        $(settingsContainer)
            .css({ width: 200px, cssFloat: left });

        var scrollContainer = document.createElement("div");
        $(scrollContainer)
            .css({ overflow: "auto" })
            .append(element, settingsContainer);
    };

    var handleMouseDown = function (event) {
        var midiNote = screenToMidiNote(event.clientY);
        var time = screenToTime(event.clientX);
        var note = findNote(midiNote, time);

        if (note) {
            currentNote = note;
        } else {
            currentNote = new pianoroll.Note(midiNote, time, 0);
            this.addNote(currentNote);
        }
    };

    var handleMouseMove = function (event) {
        var time;
        if 
    };

    this.addNote = function (note) {
        var top = (music.MAX_MIDI_NOTE - note.pitch)
            * (noteHeight + notePadding);
        var left = note.time * beatsPerMinute / 60 * beatWidth;
        var width = note.duration * beatsPerMinute / 60 * beatWidth;

        $(note).css({ top: top, left: left, width: width });

        noteRows[note.pitch].push(note);
        $(element).append(note.element);
    };

    var init = function () {
        makeUI();
        noteRows = [];
        currentNote = null;
    };
    init();
};

pianoroll.Note = function (midiNote, time, duration) {
    this.pitch = midiNote;
    this.time = time;
    this.duration = duration;
    this.element = $(document.createElement("div"))
        .attr("class", "music-note")
        .css({ height: noteHeight });
        .get(0);
};

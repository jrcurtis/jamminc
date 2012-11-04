
pianoroll = {};

pianoroll.SVG_NS = "http://www.w3.org/2000/svg";

pianoroll.PianoRoll = function (spec) {
    var that = this;

    var noteHeight = 20;
    var quarterNoteWidth = 20;
    var notePadding = 3;

    var element, svg;
    var currentNote = null;

    var makeUI = function () {
        element = document.createElement("div");
        $(element)
            .attr("class", "piano-roll")
            .mouseDown(function (event) {
                
            });

        var settingsContainer = document.createElement("div");
        $(settingsContainer)
            .css({width: 200px, cssFloat: left});

        var scrollContainer = document.createElement("div");
        $(scrollContainer)
            .css({overflow: "auto"})
            .append(element, settingsContainer);
    };

    this.addNote = function (note) {

    };

    var init = function () {

    };
    init();
};

pianoroll.Note = function (pitch, time, duration) {
    this.pitch = pitch;
    this.time = time;
    this.duration = duration;
};

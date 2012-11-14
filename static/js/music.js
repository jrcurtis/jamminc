
var music = {};

music.noteNumbers = {
    "C": 0,
    "C#": 1,
    "D": 2,
    "D#": 3,
    "E": 4,
    "F": 5,
    "F#": 6,
    "G": 7,
    "G#": 8,
    "A": 9,
    "A#": 10,
    "B": 11
};

music.noteNames = {
    0: "C",
    1: "C#",
    2: "D",
    3: "D#",
    4: "E",
    5: "F",
    6: "F#",
    7: "G",
    8: "G#",
    9: "A",
    10: "A#",
    11: "B"
};

music.MAX_MIDI_NOTE = 127;

music.log = function (x, base) {
    return Math.log(x) / Math.log(base);
};

music.frequencyToMidi = function (freq) {
    return 69 + 12 * music.log(freq / 440, 2);
};

music.midiToFrequency = function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
};

// Takes a note in either 
// Hertz: denoted 440Hz
// Note name: denoted A#4
// Or MIDI note number: denoted as a decimal number
music.parseNote = function (str) {
    var noteNamePat = /^([A-Ga-g])(#*|b*)(-?\d+)?$/;
    var frequencyPat = /(\d+)\s*Hz/i;

    var noteLetter, accidentals, octave;
    var result;

    if ((result = noteNamePat.exec(str)) !== null) {
        noteLetter = result[1];
        accidentals = result[2];
        if (accidentals.charAt(0) === "#") {
            accidentals = accidentals.length;
        } else {
            accidentals = -accidentals.length;
        }
        octave = parseInt(result[3], 10) || 4;

        result = music.noteNumbers[noteLetter]
            + 12 * (octave + 1)
            + accidentals;
    } else if ((result = frequencyPat.exec(str)) !== null) {
        result = music.frequencyToMidi(parseInt(result[1], 10));
    } else if ((result = parseFloat(str)) === NaN) {
        result = 69;
    }

    return result;
};

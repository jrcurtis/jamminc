
var music = {};

music.noteNames = {
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

music.noteNumbers = {
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

music.log = function (x, base) {
    return Math.log(x) / Math.log(base);
};

music.frequencyToNote = function (freq) {
    return 69 + 12 * music.log(freq / 440, 2);
};

music.noteToFrequency = function (note) {
    return 440 * Math.pow(2, (note - 69) / 12);
};

music.parseNote = function (noteName) {

};

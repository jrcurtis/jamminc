
mwWav = {};

mwWav.dataURI = function (data, mime, charset) {
    var uri = "data:" + mime;
    if (charset !== undefined) {
        uri += ";" + charset;
    }
    uri += ";base64,";
    uri += btoa(data);
    return uri;
};


mwWav.wav = function (spec) {
    var encodeInt = function (num, bytes) {
        var str = "";
        var i;
        for (i = 0; i < bytes; i++) {
            str += String.fromCharCode(
                (num & (0xFF << i * 8)) >> i * 8);
        }
        return str;
    };

    var encodeChunk = function (id, data) {
        var str = "";
        var i;
        for (i = 0; i < data.length; i++) {
            if (data[i][0] === 0) {
                str += data[i][1];
            } else {
                str += encodeInt(data[i][1], data[i][0]);
            }
        }
        var size = str.length;
        if ((size & 1) === 1) {
            str += encodeInt(0, 1);
        }
        return id + encodeInt(size, 4) + str;
    };

    var formatChunk = function () {
        return encodeChunk(
            "fmt ",
            [[2, 1], // Compression code
             [2, channels],
             [4, rate],
             [4, bytesPerSecond],
             [2, blockAlign],
             [2, bits],
             [2, 0]]); // Extra format bytes
    };

    // Interlaces and encodes the samples
    var dataChunk = function () {
        var str = "";
        var samples = channelData.length > 0 ? channelData[0].length : 0;
        var channel, sample;
        for (sample = 0; sample < channelData[0].length; sample++) {
            for (channel = 0; channel < channels; channel++) {
                str += encodeInt(channelData[channel][sample], bits / 8);
            }
        }
        return encodeChunk("data", [[0, str]]);
    };

    var convertSample = function (sample) {
        if (bits === 8) {
            sample = (sample + 1) / 2;
        }
        sample = Math.round(Math.min(1, Math.max(-1, sample)) * maxSample);
        if (sample < 0) {
            sample += sampleShift;
        }
        return sample;
    };

    spec = spec || {};
    var that = {};

    var channels = spec.channels || 1;
    var rate = spec.rate || 44100;
    var bits = spec.bits || 16;
    var blockAlign = channels * bits / 8;
    var bytesPerSecond = rate * channels * bits / 8;
    var maxSample = Math.pow(2, bits === 8 ? bits : bits - 1) - 1;
    var sampleShift = Math.pow(2, bits);

    var channelData = [];
    for (var i = 0; i < channels; i++) {
        channelData.push([]);
    }

    var write = function (data) {
        if (data.length !== channels) {
            throw new Error("Must write the correct number of channels");
        }

        var channel, sample;
        for (channel = 0; channel < channels; channel++) {
            for (sample = 0; sample < data[channel].length; sample++) {
                channelData[channel].push(
                    convertSample(data[channel][sample]));
            }
        }
    };
    that.write = write;

    var getWav = function () {
        return encodeChunk(
            "RIFF",
            [[0, "WAVE"],
             [0, formatChunk()],
             [0, dataChunk()]]);
    };
    that.getWav = getWav;

    var getDataURI = function () {
        return mwWav.dataURI(getWav(), "audio/wav");
    };
    that.getDataURI = getDataURI;

    var getChannels = function () {
        return channels;
    };
    that.getChannels = getChannels;

    var getSampleRate = function () {
        return rate;
    };
    that.getSampleRate = getSampleRate;

    var getBitsPerSample = function () {
        return bits;
    };
    that.getBitsPerSample = getBitsPerSample;

    return that;
};


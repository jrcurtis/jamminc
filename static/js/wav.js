
mwWAV = {};

mwWAV.dataURI = function (data, mime, charset) {
    var uri = "data:" + mime;
    if (charset !== undefined) {
        uri += ";" + charset;
    }
    uri += ";base64,";
    uri += btoa(data);
    return uri;
};


mwWAV.WAV = function (spec) {
    var that = this;
    var channels, rate, bits, blockAlign, bytesPerSecond;
    var maxSample, sampleShift, channelData;

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
        var channel, i, sample;
        for (i = 0; i < channelData[0].length; i++) {
            for (channel = 0; channel < channels; channel++) {
                sample = convertSample(channelData[channel][i]);
                str += encodeInt(sample, bits / 8);
            }
        }
        return encodeChunk("data", [[0, str]]);
    };

    var convertSample = function (sample) {
        sample = Math.min(1, Math.max(-1, sample));
        if (bits === 8) {
            sample = (sample + 1) / 2;
        }
        sample = Math.round(sample * maxSample);
        if (sample < 0) {
            sample += sampleShift;
        }
        return sample;
    };

    this.write = function (data, start) {
        if (data.length !== channels) {
            throw new Error("Must write the correct number of channels");
        }

        start = start === undefined ? channelData[0].length : start;

        var channel, i;
        for (i = channelData[0].length; i < start + data[0].length; i++) {
            for (channel = 0; channel < channels; channel++) {
                channelData[channel].push(0);
            }
        }

        for (i = 0; i < data[0].length; i++) {
            for (channel = 0; channel < channels; channel++) {
                channelData[channel][start + i] += data[channel][i];
            }
        }
    };

    this.getWav = function () {
        return encodeChunk(
            "RIFF",
            [[0, "WAVE"],
             [0, formatChunk()],
             [0, dataChunk()]]);
    };

    this.getDataURI = function () {
        return mwWAV.dataURI(this.getWav(), "audio/wav");
    };

    this.getChannels = function () {
        return channels;
    };

    this.getSampleRate = function () {
        return rate;
    };

    this.getBitsPerSample = function () {
        return bits;
    };

    var init = function () {
        spec = spec || {};

        channels = spec.channels || 1;
        rate = spec.rate || 44100;
        bits = spec.bits || 16;
        blockAlign = channels * bits / 8;
        bytesPerSecond = rate * channels * bits / 8;
        maxSample = Math.pow(2, bits === 8 ? bits : bits - 1) - 1;
        sampleShift = Math.pow(2, bits);

        channelData = [];
        for (var i = 0; i < channels; i++) {
            channelData.push([]);
        }
    };
    init();
};


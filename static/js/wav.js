
mwWAV = {};

mwWAV.dataURI = function (data, mime, charset) {
    var uri = "data:" + mime;
    if (charset !== undefined) {
        uri += ";" + charset;
    }
    uri += ";base64,";
    var i, dataStr = "";
    for (i = 0; i < data.length; i++) {
        dataStr += String.fromCharCode(data[i]);
    }
    uri += btoa(dataStr);
    return uri;
};


mwWAV.WAV = function (spec) {
    spec = spec || {};
    var that = this;

    var ID_SIZE = 4;
    var SIZE_SIZE = 4;

    var channels, rate, bits, blockAlign, bytesPerSecond;
    var maxSample, sampleShift, channelData;
    var encodedWav, encodedUri;

    var encodeInt = function (num, numBytes, bytes, offset) {
        bytes = bytes || new Uint8Array(numBytes);
        offset = offset || 0; 
        var i;
        for (i = 0; i < numBytes; i++) {
            bytes[offset + i] = (num & (0xFF << i * 8)) >> i * 8;
        }
        return bytes;
    };

    // id = 4 byte string identifying chunk
    // data = [[numBytes, value], ...]
    var encodeChunk = function (id, data) {
        var size = mw.sum(
            data.map(function (x) {
                return x[0] || (x[0] = x[1].length);
            }));
        if ((size & 1) === 1) {
            size++;
        }

        var bytes = new Uint8Array(ID_SIZE + SIZE_SIZE + size);

        var offset = 0;
        var addData = function (d, s) {
            if (d.constructor === String) {
                bytes.set(d
                          .split("")
                          .map(function (c) { return c.charCodeAt(0); }),
                          offset);
            } else if (d.length) {
                bytes.set(d, offset);
            } else {
                encodeInt(d, s, bytes, offset);
            }
            offset += s;
        };

        addData(id, ID_SIZE);
        addData(size, SIZE_SIZE);

        var i;
        for (i = 0; i < data.length; i++) {
            addData(data[i][1], data[i][0]);
        }

        return bytes;
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
        var samples = channelData.length > 0 ? channelData[0].length : 0;
        var numBytes = bits / 8;
        var size = channels * samples * numBytes;
        var bytes = new Uint8Array(size);

        var channel, i, sample, offset = 0;
        for (i = 0; i < channelData[0].length; i++) {
            for (channel = 0; channel < channels; channel++) {
                sample = convertSample(channelData[channel][i]);
                encodeInt(sample, numBytes, bytes, offset);
                offset += numBytes;
            }
        }
        return encodeChunk("data", [[0, bytes]]);
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
        encodedWav = encodedUri = null;

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

    this.getChannelData = function (channel) {
        return channelData[channel];
    };

    this.getWav = function () {
        if (encodedWav) {
            return encodedWav;
        }

        encodedWav = encodeChunk(
            "RIFF",
            [[0, "WAVE"],
             [0, formatChunk()],
             [0, dataChunk()]]);
        return encodedWav;
    };

    this.getDataURI = function () {
        if (encodedUri) {
            return encodedUri;
        }

        encodedUri = mwWAV.dataURI(this.getWav(), "audio/wav");
        return encodedUri;
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


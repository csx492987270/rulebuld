"use strict";
exports.__esModule = true;
exports.isWindows = void 0;
var os = require("os");
var isWindows = function () {   
    var osPlatform = os.platform().toString().toLowerCase();
    return osPlatform.indexOf('win') > -1;
};
exports.isWindows = isWindows;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var error_1 = require("./error");
var timbr_1 = require("timbr");
var chek_1 = require("chek");
var MUSTR_DEFAULTS = {};
var MustrBase = (function () {
    function MustrBase(options) {
        this.options = chek_1.extend({}, MUSTR_DEFAULTS, options);
        this.log = new timbr_1.Timbr();
    }
    MustrBase.prototype.error = function (name, message, meta) {
        return new error_1.ErrorExtended(message, name, meta, 1);
    };
    return MustrBase;
}());
exports.MustrBase = MustrBase;
//# sourceMappingURL=base.js.map
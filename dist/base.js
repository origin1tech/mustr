"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var error_1 = require("./error");
var timbr_1 = require("timbr");
var chek_1 = require("chek");
var MUSTR_DEFAULTS = {};
var MustrBase = (function (_super) {
    __extends(MustrBase, _super);
    function MustrBase(options) {
        var _this = _super.call(this) || this;
        _this.options = chek_1.extend({}, MUSTR_DEFAULTS, options);
        _this.log = new timbr_1.Timbr();
        return _this;
    }
    MustrBase.prototype.error = function (name, message, meta) {
        return new error_1.ErrorExtended(message, name, meta, 1);
    };
    return MustrBase;
}(events_1.EventEmitter));
exports.MustrBase = MustrBase;
//# sourceMappingURL=base.js.map
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
var fs_1 = require("./fs");
var Mustr = (function (_super) {
    __extends(Mustr, _super);
    function Mustr(options) {
        return _super.call(this, options) || this;
    }
    return Mustr;
}(fs_1.MustrFileSys));
exports.Mustr = Mustr;
//# sourceMappingURL=mustr.js.map
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
var os_1 = require("os");
var chek_1 = require("chek");
var MustrError = (function (_super) {
    __extends(MustrError, _super);
    function MustrError(message, name, prune, meta) {
        var _this = _super.call(this, message) || this;
        _this.meta = null;
        _this.stacktrace = (_this.stack || '').split(os_1.EOL);
        if (chek_1.isNumber(name)) {
            meta = prune;
            prune = name;
            name = undefined;
        }
        if (chek_1.isPlainObject(prune)) {
            meta = prune;
            prune = undefined;
        }
        _this.meta = meta;
        _this.name = name || _this.name;
        _this.stacktrace = _this.prune(prune);
        return _this;
    }
    /**
     * Split
     * : Splits a stack by newline char.
     *
     * @param stack the stack to split.
     */
    MustrError.prototype.split = function (stack) {
        if (chek_1.isArray(stack))
            return stack;
        return (stack || this.stack || '').split(os_1.EOL);
    };
    /**
     * Prune
     * : Prunes a stack by the count specified.
     *
     * @param prune the rows to be pruned.
     * @param stack an optional stack to use as source.
     */
    MustrError.prototype.prune = function (prune, stack) {
        prune = prune || 0;
        stack = this.split(stack);
        if (!prune)
            return stack;
        return stack.slice(prune);
    };
    /**
     * Frames
     * : Breaks out stack trace into stack frames.
     *
     * @param stack the stack to get stack frames for.
     */
    MustrError.prototype.frames = function (stack) {
        stack = this.split(stack);
        var frames = stack.map(function (v) {
        });
    };
    return MustrError;
}(Error));
exports.MustrError = MustrError;
//# sourceMappingURL=errors.js.map
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UDPStream = exports.getStream = exports.launch = void 0;
const puppeteer_core_1 = require("puppeteer-core");
const path = __importStar(require("path"));
const stream_1 = require("stream");
const dgram_1 = __importDefault(require("dgram"));
const extensionPath = path.join(__dirname, "..", "extension");
const extensionId = "jjndjgheafjngoipoacpjgeicjeomjli";
let currentIndex = 0;
function launch(arg1, opts) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        //if puppeteer library is not passed as first argument, then first argument is options
        if (typeof arg1.launch != "function") {
            opts = arg1;
        }
        if (!opts)
            opts = {};
        if (!opts.args)
            opts.args = [];
        function addToArgs(arg, value) {
            if (!value) {
                if (opts.args.includes(arg))
                    return;
                return opts.args.push(arg);
            }
            let found = false;
            opts.args = opts.args.map((x) => {
                if (x.includes(arg)) {
                    found = true;
                    return x + "," + value;
                }
                return x;
            });
            if (!found)
                opts.args.push(arg + value);
        }
        addToArgs("--load-extension=", extensionPath);
        addToArgs("--disable-extensions-except=", extensionPath);
        addToArgs("--allowlisted-extension-id=", extensionId);
        addToArgs("--autoplay-policy=no-user-gesture-required");
        if (((_a = opts.defaultViewport) === null || _a === void 0 ? void 0 : _a.width) && ((_b = opts.defaultViewport) === null || _b === void 0 ? void 0 : _b.height))
            opts.args.push(`--window-size=${opts.defaultViewport.width}x${opts.defaultViewport.height}`);
        opts.headless = false;
        let browser;
        if (typeof arg1.launch == "function") {
            browser = yield arg1.launch(opts);
        }
        else {
            browser = yield (0, puppeteer_core_1.launch)(opts);
        }
        if (opts.allowIncognito) {
            const settings = yield browser.newPage();
            yield settings.goto(`chrome://extensions/?id=${extensionId}`);
            yield settings.evaluate(() => {
                document
                    .querySelector("extensions-manager")
                    .shadowRoot.querySelector("#viewManager > extensions-detail-view.active")
                    .shadowRoot.querySelector("div#container.page-container > div.page-content > div#options-section extensions-toggle-row#allow-incognito")
                    .shadowRoot.querySelector("label#label input")
                    .click();
            });
            yield settings.close();
        }
        return browser;
    });
}
exports.launch = launch;
function getExtensionPage(browser) {
    return __awaiter(this, void 0, void 0, function* () {
        const extensionTarget = yield browser.waitForTarget((target) => {
            return target.type() === "page" && target.url() === `chrome-extension://${extensionId}/options.html`;
        });
        if (!extensionTarget)
            throw new Error("cannot load extension");
        const videoCaptureExtension = yield extensionTarget.page();
        if (!videoCaptureExtension)
            throw new Error("cannot get page of extension");
        return videoCaptureExtension;
    });
}
function getStream(page, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!opts.audio && !opts.video)
            throw new Error("At least audio or video must be true");
        if (!opts.mimeType) {
            if (opts.video)
                opts.mimeType = "video/webm";
            else if (opts.audio)
                opts.mimeType = "audio/webm";
        }
        if (!opts.frameSize)
            opts.frameSize = 20;
        const retryPolicy = Object.assign({}, { each: 20, times: 3 }, opts.retry);
        const extension = yield getExtensionPage(page.browser());
        const index = currentIndex++;
        const stream = new UDPStream(55200 + index, () => 
        // @ts-ignore
        extension.evaluate((index) => STOP_RECORDING(index), index));
        yield page.bringToFront();
        yield assertExtensionLoaded(extension, retryPolicy);
        extension.evaluate(
        // @ts-ignore
        (settings) => START_RECORDING(settings), Object.assign(Object.assign({}, opts), { index }));
        return stream;
    });
}
exports.getStream = getStream;
function assertExtensionLoaded(ext, opt) {
    return __awaiter(this, void 0, void 0, function* () {
        const wait = (ms) => new Promise(res => setTimeout(res, ms));
        for (let currentTick = 0; currentTick < opt.times; currentTick++) {
            // @ts-ignore
            if (yield ext.evaluate(() => typeof START_RECORDING === "function"))
                return;
            yield wait(Math.pow(opt.each, currentTick));
        }
        throw new Error("Could not find START_RECORDING function in the browser context");
    });
}
class UDPStream extends stream_1.Readable {
    constructor(port = 55200, onDestroy) {
        super({ highWaterMark: 1024 * 1024 * 8 });
        this.onDestroy = onDestroy;
        this.socket = dgram_1.default
            .createSocket("udp4", (data) => {
            this.push(data);
        })
            .bind(port, "127.0.0.1", () => { });
        this.resume();
    }
    _read(size) { }
    // @ts-ignore
    destroy(error) {
        const _super = Object.create(null, {
            destroy: { get: () => super.destroy }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.onDestroy();
            this.socket.close();
            _super.destroy.call(this);
            return this;
        });
    }
}
exports.UDPStream = UDPStream;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHVwcGV0ZWVyU3RyZWFtLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1B1cHBldGVlclN0cmVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG1EQU93QjtBQUN4QiwyQ0FBNkI7QUFDN0IsbUNBQWtDO0FBQ2xDLGtEQUFzQztBQUV0QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDOUQsTUFBTSxXQUFXLEdBQUcsa0NBQWtDLENBQUM7QUFDdkQsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO0FBT3JCLFNBQXNCLE1BQU0sQ0FDM0IsSUFBcUUsRUFDckUsSUFBMEI7OztRQUUxQixzRkFBc0Y7UUFDdEYsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLElBQUksVUFBVSxFQUFFO1lBQ3JDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDWjtRQUVELElBQUksQ0FBQyxJQUFJO1lBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7WUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUvQixTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUUsS0FBYztZQUM3QyxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUNYLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO29CQUFFLE9BQU87Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDM0I7WUFDRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7WUFDbEIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMvQixJQUFJLENB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
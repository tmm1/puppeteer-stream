/// <reference types="node" />
/// <reference types="node" />
import { LaunchOptions, Browser, Page, BrowserLaunchArgumentOptions, BrowserConnectOptions } from "puppeteer-core";
import { Readable } from "stream";
import { Socket } from "dgram";
type StreamLaunchOptions = LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions & {
    allowIncognito?: boolean;
};
export declare function launch(arg1: StreamLaunchOptions & {
    launch?: Function;
    [key: string]: any;
}, opts?: StreamLaunchOptions): Promise<Browser>;
export type BrowserMimeType = "video/webm" | "video/webm;codecs=vp8" | "video/webm;codecs=vp9" | "video/webm;codecs=vp8.0" | "video/webm;codecs=vp9.0" | "video/webm;codecs=vp8,opus" | "video/webm;codecs=vp8,pcm" | "video/WEBM;codecs=VP8,OPUS" | "video/webm;codecs=vp9,opus" | "video/webm;codecs=vp8,vp9,opus" | "audio/webm" | "audio/webm;codecs=opus" | "audio/webm;codecs=pcm";
export type Constraints = {
    mandatory?: MediaTrackConstraints;
    optional?: MediaTrackConstraints;
};
export interface getStreamOptions {
    audio: boolean;
    video: boolean;
    videoConstraints?: Constraints;
    audioConstraints?: Constraints;
    mimeType?: BrowserMimeType;
    audioBitsPerSecond?: number;
    videoBitsPerSecond?: number;
    bitsPerSecond?: number;
    frameSize?: number;
    delay?: number;
    retry?: {
        each?: number;
        times?: number;
    };
}
export declare function getStream(page: Page, opts: getStreamOptions): Promise<UDPStream>;
export declare class UDPStream extends Readable {
    onDestroy: Function;
    socket: Socket;
    constructor(port: number, onDestroy: Function);
    _read(size: number): void;
    destroy(error?: Error): Promise<this>;
}
export {};

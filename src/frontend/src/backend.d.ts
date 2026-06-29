import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Settings {
    rsiEmbedLow: number;
    bbStdDev: number;
    rsiPeriod: bigint;
    rsiEmbedHigh: number;
    rsiOversold: number;
    rsiOverbought: number;
    bbLength: bigint;
    minMinutesIntoBar: number;
    minBandWidthRatio: number;
}
export type Timestamp = bigint;
export interface SignalRow {
    low: number;
    rsi: number;
    longSnapback: boolean;
    shortSnapback: boolean;
    ticker: string;
    asset: Asset;
    bbLower: number;
    timeframe: Timeframe;
    decisionEvent: string;
    high: number;
    mode: string;
    close: number;
    name: string;
    open: number;
    time: string;
    bbUpper: number;
    bbBasis: number;
    alertId: string;
    pushThrough: boolean;
    inSession: boolean;
    minutesIntoBar: number;
    bandWidth: number;
    touchDepthRatio: number;
    touchDepth: number;
    signalType: SignalType;
}
export interface Dataset {
    id: DatasetId;
    file: ExternalBlob;
    name: string;
    rows: Array<SignalRow>;
    uploadedAt: Timestamp;
}
export type Timeframe = string;
export type DatasetId = bigint;
export type Asset = string;
export enum SignalType {
    snapbackLong = "snapbackLong",
    pushThroughShort = "pushThroughShort",
    pushThroughLong = "pushThroughLong",
    snapbackShort = "snapbackShort",
    noTrade = "noTrade"
}
export interface backendInterface {
    getDataset(id: DatasetId): Promise<Dataset | null>;
    getDatasetRows(id: DatasetId): Promise<Array<SignalRow> | null>;
    getSettings(): Promise<Settings>;
    listDatasets(): Promise<Array<Dataset>>;
    updateSettings(newSettings: Settings): Promise<void>;
    uploadDataset(name: string, file: ExternalBlob): Promise<DatasetId>;
}

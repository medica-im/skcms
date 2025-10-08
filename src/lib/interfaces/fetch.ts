export type Fetch = {
    (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
    (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response>;
};
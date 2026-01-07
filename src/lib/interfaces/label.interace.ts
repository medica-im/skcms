type FMN = {
    F: string|null;
    M: string|null;
    N: string|null;
}
type Label = {
    S: FMN;
    P: FMN;
}

export type Labels = Record<string, Label>;

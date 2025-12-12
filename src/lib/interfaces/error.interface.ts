export interface CustomError {
	error: {};
}

export interface SveltekitError {
        code: number,
        message: string,
		type: string,
    }
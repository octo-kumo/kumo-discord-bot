export interface IBaseResponse {
    statusCode: number;
    statusMessage: string;
    message: string;
}

export interface IErrorResponse extends IBaseResponse {
    error?: string;
}

export class ApiError extends Error {
    public statusCode: number;
    public statusMessage: string;
    public message: string;
    public error?: string;

    public constructor(response: IErrorResponse) {
        super(response.message);

        this.statusCode = response.statusCode;
        this.statusMessage = response.statusMessage;
        this.message = response.message;
        this.error = response.error;
    }
}

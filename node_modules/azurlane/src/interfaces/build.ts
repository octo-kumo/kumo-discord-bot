import { IBaseResponse } from "./base";

export interface IConstruction {
    time: string;
    ships: string[];
}

export interface IBuildResponse extends IBaseResponse {
    construction: IConstruction;
}
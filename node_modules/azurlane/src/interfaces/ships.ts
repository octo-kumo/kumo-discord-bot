import { IBaseResponse } from "./base";

export interface IBaseShip {
    id: string;
    name: string;
}

export interface IShipsResponse extends IBaseResponse {
    ships: IBaseShip[];
}
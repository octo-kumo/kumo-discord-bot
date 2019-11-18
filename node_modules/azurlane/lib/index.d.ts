/// <reference types="node" />

export interface IBaseResponse {
	statusCode: number;
	statusMessage: string;
	message: string;
}
export interface IErrorResponse extends IBaseResponse {
	error?: string;
}
export declare class ApiError extends Error {
	statusCode: number;
	statusMessage: string;
	message: string;
	error?: string;
	constructor(response: IErrorResponse);
}
export interface IConstruction {
	time: string;
	ships: string[];
}
export interface IBuildResponse extends IBaseResponse {
	construction: IConstruction;
}
export interface INames {
	en: string | null;
	cn: string | null;
	jp: string | null;
	kr: string | null;
}
export interface ISkin {
	title: string | null;
	image: string | null;
}
export interface IStars {
	value: string | null;
	count: number;
}
export interface IStatsItem {
	name: string | null;
	image: string | null;
	value: string | null;
}
export interface IStats {
	base?: IStatsItem[];
	level100?: IStatsItem[];
	level120?: IStatsItem[];
	retrofit100?: IStatsItem[];
	retrofit120?: IStatsItem[];
}
export interface IMiscellaneousInfo {
	link: string;
	name: string;
}
export interface IMiscellaneous {
	artist?: IMiscellaneousInfo;
	web?: IMiscellaneousInfo;
	pixiv?: IMiscellaneousInfo;
	twitter?: IMiscellaneousInfo;
	voiceActress?: IMiscellaneousInfo;
}
export interface IShip {
	wikiUrl: string;
	id: string | null;
	names: INames;
	thumbnail: string;
	skins: ISkin[];
	buildTime: string | null;
	rarity: string | null;
	stars: IStars;
	class: string | null;
	nationality: string | null;
	nationalityShort: string | null;
	hullType: string | null;
	stats: IStats;
	miscellaneous: IMiscellaneous;
}
export interface IShipResponse extends IBaseResponse {
	ship: IShip;
}
export interface IBaseShip {
	id: string;
	name: string;
}
export interface IOptions {
	userAgent?: string;
}
export declare enum Category {
	RARITY = "rarity",
	TYPE = "type",
	AFFILIATION = "affiliation"
}
export declare class AzurLane {
	/** @hidden */
	private _axiosOptions;
	protected baseUrl: string;
	options: IOptions;
	/**
	 *
	 * @param {IOptions} options Constructor options
	 * @param {string} [options.userAgent] UA to use when making http requests
	 */
	constructor(options?: IOptions);
	/**
	 * @since 0.0.1
	 *
	 * Get information about a ship by name
	 *
	 * @param {string} name The name of the ship
	 * @returns {Promise<IShip>}
	 */
	getShipByName(name: string): Promise<IShip>;
	/**
	 * @since 1.1.0
	 *
	 * Get information about a ship by id
	 *
	 * @param {string} id The id of the ship
	 * @returns {Promise<IShip>}
	 */
	getShipById(id: string): Promise<IShip>;
	/**
	 * @since 1.3.0
	 *
	 * Get a list of ships from rarity, type or affiliation
	 *
	 * @param {Order} category The category
	 * @param {string} value Value depends on what category is used, e.g. if `Category.RARITY` is used value can be `Super Rare`
	 * @returns {Promise<IBaseShip[]>}
	 */
	getShips(category: Category, value: string): Promise<IBaseShip[]>;
	/**
	 * @deprecated Deprecated since 1.3.0 use getShips() instead, this method will be remove in 2.0.0
	 * @since 1.2.0
	 *
	 * Get a list of ships from the rarity
	 *
	 * @param rarity The rarity of the ships
	 * @returns {Promise<IBaseShip[]>}
	 */
	getShipsWithRarity(rarity: string): Promise<IBaseShip[]>;
	/**
	 * @deprecated Deprecated since 1.3.0 use getShips() instead, this method will be remove in 2.0.0
	 * @since 1.2.0
	 *
	 * Get a list of ships from the type
	 *
	 * @param type The type of the ships
	 * @returns {Promise<IBaseShip[]>}
	 */
	getShipsWithType(type: string): Promise<IBaseShip[]>;
	/**
	 * @deprecated Deprecated since 1.3.0 use getShips() instead, this method will be remove in 2.0.0
	 * @since 1.2.0
	 *
	 * Get a list of ships from the affiliation
	 *
	 * @param affiliation The affiliation of the ships
	 * @returns {Promise<IBaseShip[]>}
	 */
	getShipsWithAffiliation(affiliation: string): Promise<IBaseShip[]>;
	/**
	 * @since 0.0.1
	 *
	 * Get ship names matching the given construction time
	 *
	 * @param {string} time The construction time
	 * @returns {Promise<IConstruction>}
	 */
	getBuildInfo(time: string): Promise<IConstruction>;
}
export default AzurLane;

export {};

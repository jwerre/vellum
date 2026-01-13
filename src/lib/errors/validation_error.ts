export interface ValidationDetails {
	[key: string]: string | string[];
}

export class ValidationError extends Error {
	public details: ValidationDetails;
	public status: number = 400;

	constructor(message: string, details: ValidationDetails = {}) {
		super(message);
		this.name = 'ValidationError';
		this.details = details;
	}
}

import type { AddressFeature } from "$lib/store/directoryStoreInterface";

export interface IsRequired {
    name: boolean,
    label: boolean,
    slug: boolean,
    geocoder: boolean,
    building: boolean,
    street: boolean,
    geographical_complement: boolean,
    zip: boolean,
    zoom: boolean
};
export interface InputClass {
    name: string;
    label: string;
    slug: string;
    geocoder: string;
    building: string;
    street: string;
    geographical_complement: string;
    zip: string;
    zoom: string;
}
export interface ValidateForm {
    name: boolean;
    label: boolean;
    slug: boolean;
    geocoder: boolean;
    building: boolean;
    street: boolean;
    geographical_complement: boolean;
    zip: boolean;
    zoom: boolean;
}
export const inputError = 'input-error';
const zoomIsValid = (value: number) => {
    return value >= 0 && value <= 20;
};
const slugIsValid = (value: string) => {
    const regexpSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return regexpSlug.test(value);
};
const zipIsValid = (value: string) => {
    const regexpFiveDigits = /^\d{5}$/;
    return regexpFiveDigits.test(value);
};
export const validateName = (name: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if ((isRequired.name && name) || (!isRequired.name)) {
        inputClass.name = '';
        validateForm.name = true;
    } else {
        inputClass.name = inputError;
        validateForm.name = false;
    }
};
export const validateLabel = (label: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if ((isRequired.label && label) || (!isRequired.label)) {
        inputClass.label = '';
        validateForm.label = true;
    } else {
        inputClass.label = inputError;
        validateForm.label = false;
    }
};
export const validateSlug = (slug: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if (!isRequired.slug || slug && slugIsValid(slug)) {
        inputClass.slug = '';
        validateForm.slug = true;
    } else {
        inputClass.slug = inputError;
        validateForm.slug = false;
    }
};
export const validateGeocoder = (addressFeature: AddressFeature|null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
		if (addressFeature) {
			validateForm.geocoder = true;
			inputClass.geocoder = '';
			return;
		} else {
			inputClass.geocoder = inputError;
			validateForm.geocoder = false;
		}
	};
export const validateStreet = (street: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    console.log("validating street...")
        console.log("street", street);
    if (!isRequired.street || street) {
        inputClass.street = '';
        inputClass.geocoder = '';
        validateForm.street = true;
        validateForm.geocoder = true;
    } else {
        inputClass.street = inputError;
        inputClass.geocoder = inputError;
        validateForm.street = false;
        validateForm.geocoder = false;
    }
};
export const validateZip = (zip: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if (!isRequired.zip || (zip && zipIsValid(zip))) {
        inputClass.zip = '';
        validateForm.zip = true;
    } else {
        inputClass.zip = inputError;
        validateForm.zip = false;
    }
};
export const validateZoom = (zoom: number, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if (
        (!isRequired.zoom)
        ||
        (zoom && zoomIsValid(zoom))
    ) {
        validateForm.zoom = true;
        inputClass.zoom = '';
    } else {
        inputClass.zoom = inputError;
        validateForm.zoom = false;
    }
};
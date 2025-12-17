export interface IsRequired {
    name_fr?: boolean;
    label_fr?: boolean;
    slug_fr?: boolean;
    gender?: boolean;
    isMember: boolean;
}
export interface InputClass {
    name_fr?: string;
    label_fr?: string;
    slug_fr?: string;
    gender?: string;
	isMember: string;
}
export interface ValidateForm {
    name_fr?: boolean;
    label_fr?: boolean;
    slug_fr?: boolean;
    gender?: boolean;
    isMember: boolean;
}
export const inputError = 'input-error';
const slugIsValid = (value: string) => {
    const regexpSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return regexpSlug.test(value);
};
export const validateName = (name: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if ((isRequired.name_fr && name) || (!isRequired.name_fr)) {
        inputClass.name_fr = '';
        validateForm.name_fr = true;
    } else {
        inputClass.name_fr = inputError;
        validateForm.name_fr = false;
    }
};
export const validateLabel = (label: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if ((isRequired.label_fr && label) || (!isRequired.label_fr)) {
        inputClass.label_fr = '';
        validateForm.label_fr = true;
    } else {
        inputClass.label_fr = inputError;
        validateForm.label_fr = false;
    }
};
export const validateSlug = (slug: string | null, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if (!isRequired.slug_fr || slug && slugIsValid(slug)) {
        inputClass.slug_fr = '';
        validateForm.slug_fr = true;
    } else {
        inputClass.slug_fr = inputError;
        validateForm.slug_fr = false;
    }
};
export const validateGender = (gender: string|undefined, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    if ((isRequired.gender && gender) || (!isRequired.gender)) {
        inputClass.gender = '';
        validateForm.gender = true;
    } else {
        inputClass.gender = inputError;
        validateForm.gender = false;
    }
};
export const validateIsMember = (isMember: boolean|undefined, inputClass: InputClass, isRequired: IsRequired, validateForm: ValidateForm) => {
    console.log("validateIsMember");
    if ((isRequired.isMember && isMember!==undefined) || (!isRequired.isMember)) {
        inputClass.isMember = '';
        validateForm.isMember = true;
    } else {
        inputClass.isMember = inputError;
        validateForm.isMember = false;
    }
};

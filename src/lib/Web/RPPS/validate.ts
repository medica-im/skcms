export type Validation = { success: boolean, message: string|null};

export const validate = (data: number) => {
    const dataStr= data.toString();
    if (dataStr.length !== 11) {
        return {
            success: false,
            message: `Un numéro RPPS doit comporter 11 chiffres. Ce numéro comporte ${dataStr.length} chiffre${dataStr.length>1 ? 's':''}.`
        }
    } else {
        return {success: true, message: null}
    }
}
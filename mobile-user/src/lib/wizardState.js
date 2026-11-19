// In-memory hand-off for web's router state passed to the add-property wizards
// ({ categoryName, categoryId } from the type picker, { property } when editing).
let params = {};
export const setWizardParams = (p) => { params = p || {}; };
export const getWizardParams = () => params;
export const clearWizardParams = () => { params = {}; };

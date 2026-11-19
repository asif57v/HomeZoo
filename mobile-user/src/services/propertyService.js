// Single source of truth lives in apiService.propertyService (Home, search and the partner screens all use it).
// This file only re-exports it so older imports keep working.
import { propertyService as base } from './apiService';

export const propertyService = {
  ...base,
  getPropertyDetails: (id) => base.getDetails(id),
};

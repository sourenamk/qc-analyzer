
import { AppData } from '../components/types';

const APP_DATA_KEY = 'medicalLabQCAppData';

export const saveAppData = (data: AppData): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(APP_DATA_KEY, serializedData);
  } catch (error) {
    console.error("Error saving data to local storage:", error);
    // Potentially show an error message to the user
  }
};

export const loadAppData = (): AppData | null => {
  try {
    const serializedData = localStorage.getItem(APP_DATA_KEY);
    if (serializedData === null) {
      return null;
    }
    return JSON.parse(serializedData) as AppData;
  } catch (error) {
    console.error("Error loading data from local storage:", error);
    // Potentially clear corrupted data or return null
    // localStorage.removeItem(APP_DATA_KEY); 
    return null;
  }
};

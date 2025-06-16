export class DataFetchError extends Error {
  isDataFetchError: boolean;
  
  constructor(message: string) {
    super(message);
    this.name = 'DataFetchError';
    this.isDataFetchError = true;
    
    // Fix prototype chain for TypeScript
    Object.setPrototypeOf(this, DataFetchError.prototype);
  }
}

export default DataFetchError;
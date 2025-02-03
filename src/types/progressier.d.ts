interface ProgressierInstance {
  add: (userData: {
    id?: string;
    email?: string;
    name?: string;
    [key: string]: any;
  }) => void;
}

declare global {
  interface Window {
    progressier?: ProgressierInstance;
  }
}

export {}; 
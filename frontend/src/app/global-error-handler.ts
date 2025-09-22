// src/app/global-error-handler.ts

import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('🔥 Angular caught an error:', error?.message || error);

    if (error instanceof Error) {
      console.error('🔥 Stacktrace:', error.stack);
    } else {
      try {
        console.error('🔥 JSON error:', JSON.stringify(error));
      } catch {
        console.error('🔥 Could not stringify error');
      }
    }
  }
}

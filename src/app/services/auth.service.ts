import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly EMAIL_KEY = 'email';

  setUserEmail(email: string) {
    localStorage.setItem(this.EMAIL_KEY, email);
  }

  getCurrentUserEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  clearUser() {
    localStorage.removeItem(this.EMAIL_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getCurrentUserEmail();
  }
}

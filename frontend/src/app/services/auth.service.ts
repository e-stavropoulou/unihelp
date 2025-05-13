import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly EMAIL_KEY = 'email';

  constructor(private http: HttpClient) {}

  setToken(token: string, email: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    if (email) {
      localStorage.setItem(this.EMAIL_KEY, email);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getEmail(): string | null {
    return localStorage.getItem(this.EMAIL_KEY);
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  //login
  loginUser(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${environment.API_URL}/login`, credentials);
  }

  //resend verification
  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${environment.API_URL}/resend-verification`, { email });
  }
}

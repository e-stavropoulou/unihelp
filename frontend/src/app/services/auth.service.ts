import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { clearFcmToken } from '../firebase';
import { NotificationsService } from './notifications.service';


@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_ID_KEY = 'user_id';
  private readonly EMAIL_KEY = 'email';
  private readonly ROLE_KEY = 'role';
  

  constructor(private http: HttpClient) {}

  setToken(token: string, user_id: number, email: string, role: string, refreshToken?: string) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_ID_KEY, user_id.toString());
    localStorage.setItem(this.EMAIL_KEY, email);
    localStorage.setItem(this.ROLE_KEY, role);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }

// this.notificationsService.requestWebPushToken();

  }
  
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): number | null {
    const id = localStorage.getItem(this.USER_ID_KEY);
    return id ? parseInt(id, 10) : null;
  }

  getRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.ROLE_KEY);
  }

  // Login
  loginUser(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${environment.API_URL}/login`, credentials);
  }

  // Resend email
  resendVerificationEmail(email: string): Observable<any> {
    return this.http.post(`${environment.API_URL}/resend-verification`, { email });
  }

  // FCM update
  updateFcmToken(fcm_token: string): Observable<any> {
    return this.http.post(`${environment.API_URL}/update-fcm-token`, 
      { fcm_token },
      {
        headers: {
          Authorization: `Bearer ${this.getToken()}`
        }
      }
    );
  }

  logout(redirect = true): void {

    clearFcmToken();

    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem('refresh_token');
    sessionStorage.clear();
  
  this.http.post(`${environment.API_URL}/logout`, {}, {
    headers: { Authorization: `Bearer ${this.getToken()}` }
  }).subscribe({
    next: () => console.log('✅ Backend logout done'),
    error: (err) => console.warn('⚠️ Backend logout failed:', err)
  });
  
    if (redirect) {
      window.location.replace('/login'); 
    }
  }
  
  
}

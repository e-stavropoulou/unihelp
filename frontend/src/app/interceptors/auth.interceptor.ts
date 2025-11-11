import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpErrorResponse
  } from '@angular/common/http';
  import { inject } from '@angular/core';
  import { AuthService } from '../services/auth.service';
  import { HttpClient } from '@angular/common/http';
  import { environment } from 'src/environments/environment';
  import { catchError, switchMap, throwError } from 'rxjs';
  
  let isRefreshing = false;
  
  export const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
    const auth = inject(AuthService);
    const http = inject(HttpClient);
  
    const token = auth.getToken();
    let authReq = req;
  
    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
  
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !isRefreshing) {
          console.warn("🔄 Token expired, trying refresh...");
          isRefreshing = true;
          const refresh = auth.getRefreshToken();
  
          if (refresh) {
            return http.post<any>(`${environment.API_URL}/refresh`, {}, {
              headers: { Authorization: `Bearer ${refresh}` }
            }).pipe(
              switchMap((res) => {
                console.info("✅ Refresh success, new token:", res.access_token);
                isRefreshing = false;
  
                auth.setToken(
                  res.access_token,
                  auth.getUserId()!,
                  localStorage.getItem('email')!,
                  auth.getRole()!,
                  
                );
  
                const newReq = req.clone({
                  setHeaders: { Authorization: `Bearer ${res.access_token}` }
                });
                return next(newReq);
              }),
              catchError((err) => {
                console.error("❌ Refresh failed:", err);
                isRefreshing = false;
              
                if (err.status === 403) {
                  console.warn("🚪 Refresh token invalid → forcing logout");
                  auth.logout();
                }
              
                return throwError(() => err);
              })
              
            );
          } else {
            auth.logout();
          }
        }
        return throwError(() => error);
      })
    );
  };
  
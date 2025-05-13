import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  checkCredentials(email: string, username: string) {
    return this.http.post<{ email_exists: boolean; username_exists: boolean }>(
      `${this.baseUrl}/check-credentials`,
      { email, username }
    );
  }
}

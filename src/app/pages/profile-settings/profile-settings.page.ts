import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './profile-settings.page.html',
  styleUrls: ['./profile-settings.page.scss'],
})
export class ProfileSettingsPage implements OnInit {
  userData: any = {
    full_name: '',
    username: '',
    email: '',
    courses: []
  };
  initialData: any = {}; // Για σύγκριση
  allCourses: any[] = [];
  avatarFile: File | null = null;
  avatarUrl: string | null = null;
  newPassword: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    const email = this.authService.getCurrentUserEmail();
    if (!email) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<any>(`${environment.API_URL}/profile/${email}`).subscribe({
      next: (data) => {
        this.userData = data;
        this.avatarUrl = data.avatar_url || null;
        this.initialData = { ...data, courses: [...data.courses] }; // Αρχική τιμή
      },
      error: () => {
        this.router.navigate(['/login']);
      }
    });

    this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe({
      next: (courses) => {
        this.allCourses = courses;
      }
    });
  }

  onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.avatarFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarUrl = e.target?.result as string;
      };
      reader.readAsDataURL(this.avatarFile);
    }
  }

  changesMade(): boolean {
    return (
      this.userData.full_name !== this.initialData.full_name ||
      this.userData.username !== this.initialData.username ||
      this.userData.email !== this.initialData.email ||
      JSON.stringify(this.userData.courses) !== JSON.stringify(this.initialData.courses) ||
      this.newPassword.trim().length > 0 ||
      this.avatarFile !== null
    );
  }

  async saveChanges() {
    const payload: any = {
      full_name: this.userData.full_name,
      username: this.userData.username,
      email: this.userData.email,
      courses: this.userData.courses,
    };

    if (this.newPassword.trim()) {
      payload.new_password = this.newPassword;
    }

    this.http.post(`${environment.API_URL}/update-profile`, payload).subscribe({
      next: async () => {
        if (this.avatarFile) {
          const formData = new FormData();
          formData.append('avatar', this.avatarFile);
          formData.append('email', this.userData.email);
          await this.http.post(`${environment.API_URL}/upload-avatar`, formData).toPromise();
        }

        const toast = await this.toastCtrl.create({
          message: 'Το προφίλ ενημερώθηκε!',
          duration: 1500,
          color: 'success'
        });
        await toast.present();
        this.router.navigate(['/profile']);
      },
      error: async () => {
        const toast = await this.toastCtrl.create({
          message: 'Σφάλμα κατά την αποθήκευση.',
          duration: 1500,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }
}

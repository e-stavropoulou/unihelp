import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { ToastService } from 'src/app/services/toast.service';
import { NgZone } from '@angular/core';


interface Course {
  id: number;
  name: string;
  semester: number;
}

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './profile-settings.page.html',
  styleUrls: ['./profile-settings.page.scss']
})
export class ProfileSettingsPage implements OnInit {
  userData: any = {
    full_name: '',
    username: '',
    email: ''
  };

  initialData: any = {};
  allCourses: Course[] = [];
  selectedCourseIds: number[] = [];        // can_help list
  originalCourseIds: number[] = [];

  avatarFile: File | null = null;
  avatarUrl: string | null = null;
  newPassword: string = '';

  searchTerm: string = '';
  filteredCourses: Course[] = [];
  isFocused: boolean = false;
  hasLoadedInitialCourses: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private toastService: ToastService,
    private zone: NgZone,
    private router: Router
  ) {}

  ngOnInit() {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${environment.API_URL}/profile`, { headers }).subscribe({
      next: (data) => {
        this.userData = {
          full_name: data.full_name || '',
          username: data.username || '',
          email: data.email || ''
        };
        this.avatarUrl = data.avatar_url || null;
        console.log('✅ avatar_url από backend:', data.avatar_url);


        this.selectedCourseIds = data.can_help_courses_ids || [];
        this.originalCourseIds = [...this.selectedCourseIds];
        this.initialData = { ...this.userData };

        this.http.get<Course[]>(`${environment.API_URL}/courses`).subscribe((courses) => {
          this.allCourses = courses;
          this.filteredCourses = [...this.allCourses];
          this.hasLoadedInitialCourses = true;
        });
      },
      error: () => this.router.navigate(['/login'])
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

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.allCourses.filter(course =>
      course.name.toLowerCase().includes(term)
    );
  }

  toggleCourse(course: Course) {
    if (this.selectedCourseIds.includes(course.id)) {
      this.selectedCourseIds = this.selectedCourseIds.filter(id => id !== course.id);
    } else {
      this.selectedCourseIds.push(course.id);
    }
    this.filterCourses();
  }

  isSelected(courseId: number): boolean {
    return this.selectedCourseIds.includes(courseId);
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    setTimeout(() => {
      this.isFocused = false;
    }, 200);
  }

  goBackToProfile() {
    this.router.navigate(['/profile']);
  }

  changesMade(): boolean {
    const currentIds = [...this.selectedCourseIds].sort();
    const originalIds = [...this.originalCourseIds].sort();
    return (
      this.userData.full_name !== this.initialData.full_name ||
      this.userData.username !== this.initialData.username ||
      this.userData.email !== this.initialData.email ||
      JSON.stringify(currentIds) !== JSON.stringify(originalIds) ||
      this.newPassword.trim().length > 0 ||
      this.avatarFile !== null
    );
  }
  

  async saveChanges() {

    const token = this.authService.getToken();
    if (!token) return;

    // 🛑 Αν δεν έχει τουλάχιστον ένα μάθημα
    if (this.selectedCourseIds.length === 0) {
      await this.toastService.present('Πρέπει να επιλέξεις τουλάχιστον ένα μάθημα στο πεδίο "Μπορώ να βοηθήσω".', 'warning');
      return;
    }
    

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const profilePayload: any = {
      full_name: this.userData.full_name,
      username: this.userData.username,
      email: this.userData.email,
    };

    if (this.newPassword.trim()) {
      profilePayload.new_password = this.newPassword;
    }

    try {
      // Update βασικού προφίλ
      await this.http.post(`${environment.API_URL}/update-profile`, profilePayload, { headers }).toPromise();

      // Upload avatar αν έχει αλλαχτεί
      if (this.avatarFile) {
        const formData = new FormData();
        formData.append('avatar', this.avatarFile);
      
        console.log('📸 Ανεβάζουμε avatar...', this.avatarFile);
      
        const res = await this.http.post(`${environment.API_URL}/upload-avatar`, formData, { headers }).toPromise();
        console.log('✅ Απάντηση από το backend μετά το upload:', res);
      }
      

      // Υπολογισμός διαφορών can_help και αποστολή
      const updates = this.allCourses.filter(course => {
        const wasSelected = this.originalCourseIds.includes(course.id);
        const isSelected = this.selectedCourseIds.includes(course.id);
        return wasSelected !== isSelected;
      });

      const updateRequests = updates.map(course => {
        const payload = {
          course_id: course.id,
          can_help: this.selectedCourseIds.includes(course.id)
        };
        return this.http.post(`${environment.API_URL}/update-can-help`, payload, { headers }).toPromise();
      });

      await Promise.all(updateRequests);

      // Καλούμε το δικό σου service
      /* this.zone.run(async () => {
        const toast = await this.toastCtrl.create({
          message: 'Το προφίλ ενημερώθηκε!',
          duration: 2000,
          position: 'bottom'
        });
        await toast.present();
      });
      
      

      await this.goBackToProfile();
      console.log("✅ Toast dismissed, πάμε redirect...");  
      console.log("🚀 Calling navigate to /profile...");
      */

      this.zone.run(async () => {
        await this.toastService.present('Το προφίλ ενημερώθηκε!', 'success');
      
        console.log("✅ Toast done, πάμε redirect...");
        this.goBackToProfile();
      });
      

    } catch (error) {
      this.zone.run(async () => {
        await this.toastService.present('Σφάλμα κατά την αποθήκευση.', 'error');
      });
      

    }
  }
}

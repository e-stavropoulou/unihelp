import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonLabel,
  IonSearchbar,
  IonList,
  IonItem,
  IonChip,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

import { Router, RouterModule } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';

interface RegisterResponse {
  message: string;
  token: string;
  email: string;
}

interface Course {
  id: number;
  name: string;
  semester: number | null;
  type: string;
}


@Component({
  selector: 'app-signup-step2',
  standalone: true,
  imports: [
    FormsModule,
    IonLabel,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonList,
    IonItem,
    IonChip,
    IonButton,
    IonIcon,
    CommonModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './signup-step2.page.html',
  styleUrls: ['./signup-step2.page.scss']
})
export class SignupStep2Page {
  searchTerm: string = '';
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  selectedCourses: Course[] = [];



  userData: any;
  isFocused: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    const nav = this.router.getCurrentNavigation();
    this.userData = nav?.extras?.state;

    if (!this.userData) {
      this.router.navigate(['/signup-step1']);
    }

    this.loadCourses();
  }

  loadCourses() {
    this.http.get<Course[]>(`${environment.API_URL}/courses`).subscribe((data) => {
      this.allCourses = data;
      this.filteredCourses = this.allCourses;
    });    
  }

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.allCourses.filter(course =>
      course.name.toLowerCase().includes(term) &&
      !this.selectedCourses.find(c => c.name === course.name)
    );    
  }

  selectCourse(course: Course) {
    if (!this.selectedCourses.find(c => c.name === course.name)) {
      this.selectedCourses.push(course);
      this.filterCourses();
    }    
  }

  removeCourse(course: Course) {
    this.selectedCourses = this.selectedCourses.filter(c => c.name !== course.name);
    this.filterCourses();
  }

  submit() {
    if (this.selectedCourses.length === 0) {
      this.toastService.present('Επίλεξε τουλάχιστον 1 μάθημα.', 'warning');
      return;
    }

    const payload = {
      ...this.userData,
      skills: this.selectedCourses.map(c => c.name)
    };

    this.http.post<RegisterResponse>(`${environment.API_URL}/register`, payload).subscribe({
      next: (res) => {
        this.toastService.present('Η εγγραφή σου ολοκληρώθηκε! Έλεγξε το email σου.', 'success');
        this.router.navigate(['/verify-info'], { replaceUrl: true });
      },
      error: (err) => {
        this.toastService.present(err.error?.error || 'Κάτι πήγε λάθος.', 'error');
      }
    });
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    setTimeout(() => {
      this.isFocused = false;
    }, 200);
  }
}


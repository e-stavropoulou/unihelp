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


@Component({
  selector: 'app-signup-step2',
  standalone: true,
  imports: [
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
  styleUrls: ['./signup-step2.page.scss'],
})
export class SignupStep2Page {
  searchTerm: string = '';
  allCourses: string[] = [];
  filteredCourses: string[] = [];
  selectedCourses: string[] = [];

  userData: any;
  isFocused: boolean = false;


  constructor(private router: Router, private http: HttpClient, private toastService: ToastService) {
    const nav = this.router.getCurrentNavigation();
    this.userData = nav?.extras?.state;

    if (!this.userData) {
      this.router.navigate(['/signup-step1']);
    }

    this.loadCourses();
  }

  loadCourses() {
    this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe((data) => {
      this.allCourses = data.map((course) => course.name);
      this.filteredCourses = this.allCourses;
    });
  }

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.allCourses.filter(course =>
      course.toLowerCase().includes(term) &&
      !this.selectedCourses.includes(course)
    );
  }

  selectCourse(course: string) {
    if (!this.selectedCourses.includes(course)) {
      this.selectedCourses.push(course);
      this.filterCourses();
    }
  }

  removeCourse(course: string) {
    this.selectedCourses = this.selectedCourses.filter(c => c !== course);
    this.filterCourses();
  }

  submit() {
    if (this.selectedCourses.length === 0) {
      this.toastService.present('Επίλεξε τουλάχιστον 1 μάθημα.', 'warning');
      return;
    }
  
    const payload = {
      ...this.userData,
      skills: this.selectedCourses
    };
  
    this.http.post(`${environment.API_URL}/register`, payload).subscribe({
      next: () => {
        this.toastService.present('Εγγραφή επιτυχής!', 'success');
        this.router.navigate(['/profile'], {
          state: { email: this.userData.email }
        });
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
    }, 200);  // επιτρέπει να πατήσεις επιλογή πριν κρυφτεί
  }
  
}

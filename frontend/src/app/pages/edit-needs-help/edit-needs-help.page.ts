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
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import { FormsModule } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';

interface Course {
  id: number;
  name: string;
  semester: number;
  type?: string;
}


@Component({
  selector: 'app-edit-needs-help',
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
  templateUrl: './edit-needs-help.page.html',
  styleUrls: ['./edit-needs-help.page.scss']
})


export class EditNeedsHelpPage {
  searchTerm: string = '';
  allCourses: Course[] = [];
  filteredCourses: Course[] = [];
  selectedCourseIds: number[] = [];
  originalCourseIds: number[] = [];
  isFocused: boolean = false;
  hasLoadedInitialCourses: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.loadCourses();
  }

  loadCourses() {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${environment.API_URL}/profile`, { headers }).subscribe((user) => {
      this.selectedCourseIds = user.needs_help_courses_ids || [];
      this.originalCourseIds = [...this.selectedCourseIds];

      this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe((data) => {
        this.allCourses = data;
        this.filterCourses();
        this.hasLoadedInitialCourses = true;
      });
    });
  }

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.allCourses.filter(course =>
      course.name.toLowerCase().includes(term)
    );
  }

  isSelected(courseId: number): boolean {
    return this.selectedCourseIds.includes(courseId);
  }  

  toggleCourse(course: Course) {
    if (this.isSelected(course.id)) {
      this.selectedCourseIds = this.selectedCourseIds.filter(id => id !== course.id);
    } else {
      this.selectedCourseIds.push(course.id);
    }
    this.filterCourses();
  }

  saveChanges() {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const updates = this.allCourses.filter(course => {
      const wasSelected = this.originalCourseIds.includes(course.id);
      const isSelected = this.selectedCourseIds.includes(course.id);
      return wasSelected !== isSelected;
    });

    const requests = updates.map(course => {
      const payload = {
        course_id: course.id,
        needs_help: this.selectedCourseIds.includes(course.id)
      };
      return this.http.post(`${environment.API_URL}/update-needs-help`, payload, { headers });
    });

    Promise.all(requests.map(req => req.toPromise()))
      .then(() => {
        this.toastService.present('Οι αλλαγές αποθηκεύτηκαν.', 'success');
        this.goBackToProfile();
      })
      .catch(() => {
        this.toastService.present('Σφάλμα κατά την αποθήκευση αλλαγών.', 'error');
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

  goBackToProfile() {
    this.router.navigate(['/profile']);
  }

  allCoursesFilteredSelected(): Course[] {
    return this.hasLoadedInitialCourses
      ? this.allCourses.filter(c => this.isSelected(c.id))
      : [];
  }
}

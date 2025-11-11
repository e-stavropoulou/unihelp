import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-edit-note',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './edit-note.page.html',
  styleUrls: ['./edit-note.page.scss'],
})
export class EditNotePage implements OnInit {
  noteId: number = 0;
  title: string = '';
  description: string = '';
  category: string = '';
  courseId: number | null = null;
  filenamePreview: string = ''; 
  searchTerm: string = '';
  filteredCourses: any[] = [];
  selectedCourse: any = null;
  isFocused: boolean = false;


  courses: any[] = [];
  files: File[] = []; 

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private navCtrl: NavController,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.noteId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadCourses();
    this.loadNote();
  }

  loadCourses() {
    this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe(data => {
      this.courses = data;
      if (this.courseId) {
        this.selectedCourse = this.courses.find(c => c.id === this.courseId);
      }
      this.filteredCourses = [...this.courses];      
      this.courseId && (this.selectedCourse = this.courses.find(c => c.id === this.courseId));
    });
  }

  loadNote() {
    const token = this.authService.getToken();
    this.http.get<any>(`${environment.API_URL}/get-note/${this.noteId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe(note => {
      this.title = note.title;
      this.description = note.description;
      this.category = note.category;
      this.courseId = note.course_id;
      this.selectedCourse = note.course || null;
    });
  }

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
    this.filenamePreview = this.files[0]?.name || '';
  }

  removeSelectedFile() {
    this.files = [];
    this.filenamePreview = '';
  }

  isFormValid(): boolean {
    return (
      this.title.trim() !== '' &&
      this.category !== '' &&
      this.courseId !== null
    );
  }

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.courses.filter(course =>
      course.name.toLowerCase().includes(term)
    );
  }
  
  selectCourse(course: any) {
    this.selectedCourse = course;
    this.courseId = course.id; 
    this.isFocused = false;
    this.searchTerm = '';
  }
  
  clearSelectedCourse() {
    this.selectedCourse = null;
    this.courseId = null;
  }

  onBlur() {
    setTimeout(() => {
      this.isFocused = false;
    }, 200);
  }

  onFocus() {
    this.isFocused = true;
  }  
  

  handleUpdateClick() {
    if (this.title.trim() === '') {
      this.toastService.present('Ο τίτλος είναι υποχρεωτικός.', 'warning');
      return;
    }

    if (this.description.trim() === '') {
      this.toastService.present('Η περιγραφή είναι υποχρεωτική.', 'warning');
      return;
    }
    
  
    if (this.category.trim() === '') {
      this.toastService.present('Η κατηγορία είναι υποχρεωτική.', 'warning');
      return;
    }
  
    if (this.courseId === null) {
      this.toastService.present('Πρέπει να επιλέξεις μάθημα.', 'warning');
      return;
    }
  
    const formData = new FormData();
    formData.append('title', this.title);
    formData.append('description', this.description || '');
    formData.append('category', this.category);
    formData.append('course_id', this.courseId?.toString() || '');
  
    if (this.files.length > 0) {
      formData.append('file', this.files[0]);
    }
  
    const token = this.authService.getToken();
    this.http.put(`${environment.API_URL}/edit-note/${this.noteId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).subscribe({
      next: () => {
        this.toastService.present('Η σημείωση ενημερώθηκε με επιτυχία!', 'success');
        this.navCtrl.back();
      },
      error: () => {
        this.toastService.present('Σφάλμα κατά την ενημέρωση.', 'error');
      }
    });
  }  
}

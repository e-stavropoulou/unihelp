import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-upload-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './upload-notes.page.html',
  styleUrls: ['./upload-notes.page.scss'],
})
export class UploadNotesPage implements OnInit {

  title: string = '';
  description: string = '';
  category: string = '';
  courseId: number | null = null;
  files: File[] = [];

  courses: any[] = [];
  userEmail: string = ''; // θα έρθει από το προφίλ ή το auth service

  constructor(
    private http: HttpClient,
    private navCtrl: NavController,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.userEmail = localStorage.getItem('email') || ''; // ή αλλιώς αν το περνάς αλλού
    this.loadCourses();
  }

  loadCourses() {
    this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe(data => {
      this.courses = data;
    });
  }

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
  }

  
  isFormValid(): boolean {
    return (
      this.title.trim() !== '' &&
      this.category !== '' &&
      this.courseId !== null &&
      this.files.length > 0
    );
  }

  
  handleUploadClick() {
    if (!this.isFormValid()) {
      this.toastService.present('Παρακαλώ συμπλήρωσε όλα τα υποχρεωτικά πεδία.');
      return;
    }

    this.onSubmit();
  }

  async onSubmit() {
    const formData = new FormData();
    formData.append('email', this.userEmail);
    formData.append('title', this.title);
    formData.append('description', this.description || '');
    formData.append('category', this.category);
    formData.append('course_id', this.courseId?.toString() || '');

    for (let file of this.files) {
      formData.append('files', file);
    }

    this.http.post(`${environment.API_URL}/upload-note`, formData).subscribe({
      next: async res => {
        this.toastService.present('Οι σημειώσεις ανέβηκαν με επιτυχία!', 'success');
        this.navCtrl.back();
      },
      error: async err => {
        this.toastService.present('Κάτι πήγε στραβά. Δοκίμασε ξανά.', 'error');
      }
    });
  }
}

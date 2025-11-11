import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { ToastService } from 'src/app/services/toast.service';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { NotificationsService } from 'src/app/services/notifications.service';
import { HttpEventType } from '@angular/common/http';



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
  searchTerm: string = '';
  filteredCourses: any[] = [];
  selectedCourseName: string = ''; 
  selectedCourseSemester: number | null = null;
  selectedCourseType: string | null = null;
  courses: any[] = [];
  showDropdown: boolean = false;
  isUploading = false;
  uploadProgress = 0;
  


  constructor(
    private http: HttpClient,
    private navCtrl: NavController,
    private toastService: ToastService,
    private authService: AuthService,
    private notificationService: NotificationsService
  ) {}

  ngOnInit() {
    this.loadCourses();

    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }
  

  loadCourses() {
    this.http.get<any[]>(`${environment.API_URL}/courses`).subscribe(data => {
      this.courses = data;
      this.filteredCourses = data;
    });
  }

  onFileChange(event: any) {
    this.files = Array.from(event.target.files);
  }

  isFormValid(): boolean {
    return (
      this.title.trim() !== '' &&
      this.description.trim() !== '' &&
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

  handleOutsideClick(event: MouseEvent) {
    const searchWrapper = document.querySelector('.search-wrapper');
    const dropdown = document.querySelector('.custom-dropdown');
  
    if (
      searchWrapper &&
      !searchWrapper.contains(event.target as Node) &&
      dropdown &&
      !dropdown.contains(event.target as Node)
    ) {
      this.showDropdown = false;
    }
  }

  onSearchWrapperClick(event: Event) {
    event.stopPropagation();
  }
  
  

  filterCourses() {
    const term = this.searchTerm.toLowerCase();
    this.filteredCourses = this.courses.filter(course =>
      course.name.toLowerCase().includes(term)
    );
  }
  
  selectCourse(course: any) {
    this.courseId = course.id;
    this.selectedCourseName = course.name;
    this.searchTerm = '';
    this.filteredCourses = [];
    this.selectedCourseSemester = course.semester;
    this.selectedCourseType = course.type; 
  }
  
  clearSelectedCourse() {
    this.courseId = null;
    this.selectedCourseName = '';
    this.selectedCourseSemester = null;
    this.searchTerm = '';
    this.filteredCourses = [...this.courses];  
    this.showDropdown = true;                  
  }
  
  

  async onSubmit() {
    if (this.isUploading) return; 
  
    this.isUploading = true;
    this.uploadProgress = 0;
  
    const formData = new FormData();
    formData.append('title', this.title);
    formData.append('description', this.description || '');
    formData.append('category', this.category);
    formData.append('course_id', this.courseId?.toString() || '');
  
    for (let file of this.files) {
      formData.append('files', file);
    }
  
    this.http.post(`${environment.API_URL}/upload-note`, formData, {
      headers: { Authorization: `Bearer ${this.authService.getToken()}` },
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.toastService.present('Οι σημειώσεις ανέβηκαν με επιτυχία!', 'success');
          this.notificationService.refreshUnreadCount();
          this.isUploading = false;
          this.navCtrl.back();
        }
      },
      error: () => {
        this.toastService.present('Κάτι πήγε στραβά. Δοκίμασε ξανά.', 'error');
        this.isUploading = false;
      }
    });
  }
}

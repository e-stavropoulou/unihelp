import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { FooterNavComponent } from '../../components/footer-nav/footer-nav.component';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { NgZone } from '@angular/core';
import { ToastService } from 'src/app/services/toast.service';
import { ModalController } from '@ionic/angular';
import { ReportModalComponent } from 'src/app/components/report-modal/report-modal.component';


@Component({
  selector: 'app-notes-feed',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, FooterNavComponent],
  templateUrl: './notes-feed.page.html',
  styleUrls: ['./notes-feed.page.scss']
})
export class NotesFeedPage implements OnInit {
  notes: any[] = [];
  filteredNotes: any[] = [];
  allCourses: string[] = [];
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedCourse: string = '';
  selectedSemester: number | '' = '';
  selectedType: string = '';
  semesters: number[] = Array.from({ length: 10 }, (_, i) => i + 1);
  currentUserId: number = 0;



  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private zone: NgZone,
    private toastService: ToastService,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getUserId() || 0;
    this.loadAllNotes();
  }

  loadAllNotes() {
    const token = this.authService.getToken();
    if (!token) return;

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/all-notes`, { headers })
      .subscribe({
        next: (data) => {
          this.notes = data;
          this.allCourses = [...new Set(data.map(note => note.course))];
          console.log('✅ allCourses AFTER LOAD:', this.allCourses);
          this.applyFilters();
        },
        error: (err) => {
          console.error('Failed to load notes feed:', err);
        }
      });
  }

  applyFilters() {
    this.filteredNotes = this.notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesCategory = this.selectedCategory ? note.category === this.selectedCategory : true;
      const matchesCourse = this.selectedCourse ? note.course === this.selectedCourse : true;
      const matchesSemester = this.selectedSemester ? note.semester === Number(this.selectedSemester) : true;
      const matchesType = this.selectedType ? note.type === this.selectedType : true;
    
      return matchesSearch && matchesCategory && matchesCourse && matchesSemester && matchesType;
    });    
  }

  onSearchChange() {
    this.applyFilters();
  }

  onCategoryChange() {
    this.applyFilters();
  }

  onCourseChange() {
    this.applyFilters();
  }

  downloadNote(note: any) {
    const token = this.authService.getToken();
    const downloadUrl = `${environment.API_URL}/download/${note.id}`;
  
    // Δημιουργία anchor tag με το JWT
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  
    // ✅ Τοπική αύξηση των downloads
    this.zone.run(() => {
      note.downloads += 1;
    });
  
    link.click();
  }

  toggleComments(note: any) {
    note.showComments = !note.showComments;
    if (note.showComments && !note.commentsLoaded) {
      const token = this.authService.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
      this.http.get(`${environment.API_URL}/notes/${note.id}/comments`, { headers })
        .subscribe((data: any) => {
          note.comments = data;
          note.commentsLoaded = true;
        });
    }
  }
  
  toggleCommentBox(note: any) {
    note.showCommentBox = !note.showCommentBox;
  }
  
  submitComment(note: any) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
    const payload = { text: note.newComment };
  
    this.http.post(`${environment.API_URL}/notes/${note.id}/comments`, payload, { headers })
      .subscribe({
        next: async (res: any) => {
          if (!note.comments) note.comments = [];
          note.comments.push(res);
          note.newComment = '';
          note.showCommentBox = false;
  
          // ✅ Λίστα με τυχαία μηνύματα επιτυχίας
          const messages = [
            'Το σχόλιο ανέβηκε!',
            'Επιτυχής προσθήκη σχολίου!',
            'Το σχόλιό σου καταχωρήθηκε!',
            'Ευχαριστούμε για το σχόλιό σου!',
            'Το σχόλιο προστέθηκε με επιτυχία!'
          ];
          const randomMsg = messages[Math.floor(Math.random() * messages.length)];
  
          // Εμφάνιση toast
          await this.toastService.present(randomMsg, 'success');
        },
        error: async (err) => {
          console.error('Error submitting comment:', err);
          await this.toastService.present('Σφάλμα κατά την ανάρτηση σχολίου.', 'error');
        }
      });
  }
  
  deleteComment(note: any, comment: any) {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
    this.http.delete(`${environment.API_URL}/comments/${comment.id}`, { headers })
      .subscribe(() => {
        note.comments = note.comments.filter((c: any) => c.id !== comment.id);
      });
  }
  
  editComment(note: any, comment: any) {
    const newText = prompt('Επεξεργασία σχολίου:', comment.text);
    if (newText && newText.trim() !== '') {
      const token = this.authService.getToken();
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
      this.http.put(`${environment.API_URL}/comments/${comment.id}`, { text: newText }, { headers })
        .subscribe((res: any) => {
          comment.text = res.text;
        });
    }
  }
  
  
  

  async addToFavorites(note: any) {
    const token = this.authService.getToken();

    if (!token) {
      await this.toastService.present('Πρέπει να είσαι συνδεδεμένος για να προσθέσεις αγαπημένα.', 'error');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post(`${environment.API_URL}/favorite`, {
      note_id: note.id
    }, { headers })
    .subscribe({
      next: async (res: any) => {
        console.log('✅ Success res:', res);

        await this.toastService.present(res.message || 'Επιτυχία!', 'success');

        this.zone.run(() => {
          note.isFavorite = !note.isFavorite;
        });
      },
      error: async (err) => {
        await this.toastService.present('Σφάλμα κατά την αποθήκευση στα αγαπημένα.', 'error');
        console.error(err);
      }
    });
  }

  async openReport(noteId?: number, reportedUserId?: number) {
    console.log('STEP 1: openReport CALLED with', noteId, reportedUserId);
  
    try {
      console.log('STEP 2: calling modalCtrl.create...');
      const modal = await this.modalCtrl.create({
        component: ReportModalComponent,
        componentProps: { noteId, reportedUserId },
        animated: false
      });
      console.log('STEP 3: modal created', modal);
  
      await modal.present();
      console.log('STEP 4: modal presented');
    } catch (err) {
      console.error('❌ ERROR during modal create/present:', err);
    }
  }
  
  
  
}

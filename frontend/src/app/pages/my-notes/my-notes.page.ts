import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast.service';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';



@Component({
  selector: 'app-my-notes',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './my-notes.page.html',
  styleUrls: ['./my-notes.page.scss']
})
export class MyNotesPage implements OnInit {
  notes: any[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.loadNotes(); 
  }

  ionViewWillEnter() {
    this.loadNotes();
  }
  

  loadNotes() {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('No token found. User might not be logged in.');
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${environment.API_URL}/my-notes`, { headers })
      .subscribe({
        next: data => this.notes = data,
        error: err => {
          console.error('❌ Error loading notes:', err);
          if (err && typeof err === 'object') {
            try {
              console.log('🔍 Error JSON:', JSON.stringify(err));
            } catch {
              console.log('🔍 Raw error (non-serializable):', err);
            }
          }
        }
        
      });
  }

  editNote(note: any) {
    console.log('note:', note);
    this.router.navigate(['/edit-note', note.id]);
  }  
  
  async deleteNote(note: any) {
    const alert = await this.alertCtrl.create({
      header: 'Επιβεβαίωση',
      message: `Θες σίγουρα να διαγράψεις τη σημείωση "${note.title}";`,
      buttons: [
        {
          text: 'Ακύρωση',
          role: 'cancel'
        },
        {
          text: 'Διαγραφή',
          role: 'destructive',
          handler: () => {
            const token = this.authService.getToken();
            const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
  
            this.http.delete(`${environment.API_URL}/delete-note/${note.id}`, { headers }).subscribe({
              next: () => {
                this.toastService.present('Η σημείωση διαγράφηκε επιτυχώς!', 'success');
                this.loadNotes();
              },
              error: err => {
                console.error('❌ Delete note error:', err);
              
                // Εμφάνισε πιο αναλυτικά το περιεχόμενο
                if (err && typeof err === 'object') {
                  try {
                    console.log('🔍 Error JSON:', JSON.stringify(err));
                  } catch {
                    console.log('🔍 Raw error (non-serializable):', err);
                  }
                } else {
                  console.log('🔍 Error string:', err);
                }
              
                this.toastService.present('Σφάλμα κατά τη διαγραφή.', 'error');
              }
              
            });
          }
        }
      ]
    });
  
    await alert.present();
  }  
  

  openNote(note: any) {
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.present('Πρέπει να είσαι συνδεδεμένος για να ανοίξεις τις σημειώσεις σου.', 'error');
      return;
    }
  
    // ✅ Direct URL με JWT στο query
    const directUrl = `${environment.API_URL}/download/${note.id}?jwt=${encodeURIComponent(token)}`;
  
    if (Capacitor.isNativePlatform()) {
      // iOS/Android
      Browser.open({ url: directUrl });
    } else {
      // Web
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    }
  }
  
  
}

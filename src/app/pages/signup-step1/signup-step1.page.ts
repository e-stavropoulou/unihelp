import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from 'src/app/services/toast.service';
import { AuthApiService } from 'src/app/services/auth-api.service'; 

@Component({
  selector: 'app-signup-step1',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './signup-step1.page.html',
  styleUrls: ['./signup-step1.page.scss'],
})
export class SignupStep1Page {
  email = '';
  username = '';
  fullName = '';
  password = '';
  semester: number | null = null;
  year: number | null = null;
  birthdate = '';

  constructor(
    private router: Router,
    private toastService: ToastService,
    private authApi: AuthApiService 
  ) {}

  goToStep2() {
    const validEmail = this.email.endsWith('@upatras.gr') || this.email.endsWith('.ceid.upatras.gr');

    if (!this.email || !this.username || !this.fullName || !this.password || !this.semester || !this.year || !this.birthdate) {
      this.toastService.present('Συμπλήρωσε όλα τα πεδία!', 'warning');
      return;
    }

    if (!validEmail) {
      this.toastService.present('Το email πρέπει να είναι από το upatras.gr ή ceid.upatras.gr');
      return;
    }

    if (this.password.length < 8) {
      this.toastService.present('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
      return;
    }

    const birthdateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!birthdateRegex.test(this.birthdate)) {
      this.toastService.present('Η ημερομηνία πρέπει να είναι στη μορφή dd-mm-yyyy.');
      return;
    }

    const [day, month, year] = this.birthdate.split('-').map(Number);
    const birthDateObj = new Date(year, month - 1, day);
    const today = new Date();

    if (isNaN(birthDateObj.getTime()) || birthDateObj.getDate() !== day || birthDateObj.getMonth() !== month - 1 || birthDateObj.getFullYear() !== year) {
      this.toastService.present('Η ημερομηνία είναι μη έγκυρη.');
      return;
    }

    if (birthDateObj > today) {
      this.toastService.present('Η ημερομηνία δεν μπορεί να είναι στο μέλλον.');
      return;
    }

    const age = today.getFullYear() - year;
    if (age < 17 || (age === 17 && (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)))) {
      this.toastService.present('Πρέπει να είσαι τουλάχιστον 17 ετών για να εγγραφείς.');
      return;
    }

    // Κλήση στο backend για έλεγχο email/username
    this.authApi.checkCredentials(this.email, this.username).subscribe({
      next: (res) => {
        if (res.email_exists) {
          this.toastService.present('Το email χρησιμοποιείται ήδη.', 'warning');
        } else if (res.username_exists) {
          this.toastService.present('Το username χρησιμοποιείται ήδη.', 'warning');
        } else {
          // Όλα εντάξει → πάμε στο Βήμα 2
          this.router.navigate(['/signup-step2'], {
            state: {
              email: this.email,
              username: this.username,
              fullName: this.fullName,
              password: this.password,
              semester: this.semester,
              year: this.year,
              birthdate: this.birthdate
            }
          });
        }
      },
      error: () => {
        this.toastService.present('Σφάλμα κατά τον έλεγχο των στοιχείων. Προσπάθησε ξανά.', 'error');
      }
    });
  }
}

import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-email-verified',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './email-verified.page.html',
  styleUrls: ['./email-verified.page.scss']
})
export class EmailVerifiedPage {
  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

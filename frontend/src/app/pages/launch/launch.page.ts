import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { Router } from '@angular/router';


@Component({
  selector: 'app-launch',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule], 
  templateUrl: './launch.page.html',
  styleUrls: ['./launch.page.scss'],
})
export class LaunchPage {
  constructor(private router: Router) {}

  goLogin() {
    console.log('ΠΑΤΗΘΗΚΕ');
    this.router.navigateByUrl('/login').then(() => {
      location.reload(); 
    });
  }  
}



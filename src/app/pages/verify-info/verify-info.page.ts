import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-verify-info',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './verify-info.page.html',
  styleUrls: ['./verify-info.page.scss']
})
export class VerifyInfoPage {}

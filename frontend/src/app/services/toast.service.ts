// src/app/services/toast.service.ts
import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private toastController: ToastController) {}

  async present(
    message: string,
    type: 'success' | 'error' | 'warning' = 'error'
  ) {
    let cssClass: string;
    let icon: string;

    switch (type) {
      case 'success':
        cssClass = 'toast-success';
        icon = '✅';
        break;
      case 'warning':
        cssClass = 'toast-warning';
        icon = '⚠️';
        break;
      default:
        cssClass = 'toast-error';
        icon = '❌';
    }

    const toast = await this.toastController.create({
      message: `${icon} ${message}`,
      duration: 1000,
      position: 'top',
      cssClass: [cssClass, 'toast-top-adjust']
    });

    await toast.present();
  }
}
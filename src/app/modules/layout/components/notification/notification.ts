import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ModalInfo } from '../modal-info/modal-info';
import { Global } from 'app/services/global';

@Component({
  selector: 'app-notification',
  imports: [CommonModule,ModalInfo],
  templateUrl: './notification.html',
  styleUrl: './notification.css'
})
export class Notification {

 // Signal para controlar el estado de visibilidad del modal
  isModalOpen = signal(false);
  totalPoints = 0;

  // Signal ficticio para el punto de notificación
  hasUnread = signal(true);

  // Datos de ejemplo para los PDFs
  pdfFiles = [
    { id: 1, name: 'Informe de contaminación atmosferica', url: 'pdf_1.pdf' },
    { id: 2, name: 'El problema de la contaminación cerca de nuestros hijos', url: 'pdf_2.pdf' },
    // { id: 3, name: 'Historial de Alertas', url: 'assets/pdf3.pdf' },
    // { id: 4, name: 'La tecnologia detras de la aplicacion', url: 'assets/pdf3.pdf' },

  ];

  constructor(private _global:Global) {
    this._global.totalPoints$.subscribe(value => {
      this.totalPoints = value;
    });
  }

  // Método para alternar el estado del modal
  toggleModal() {
    this.isModalOpen.update(current => !current);
  }

  // Método para cerrar el modal (útil para que el modal lo llame)
  closeModal() {
    this.isModalOpen.set(false);
  }
}

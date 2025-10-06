import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'totalPoints';

@Injectable({
  providedIn: 'root'
})
export class Global {
    // Inicializa con el valor de localStorage o 0 si no existe
  private initialPoints = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  private pointsSubject = new BehaviorSubject<number>(this.initialPoints);

  // Observable al que los componentes se suscriben
  totalPoints$ = this.pointsSubject.asObservable();

  // Obtener valor actual
  get totalPoints(): number {
    return this.pointsSubject.value;
  }

  // Modificar valor
  setTotalPoints(points: number) {
    this.pointsSubject.next(points);
    localStorage.setItem(STORAGE_KEY, points.toString());
  }

  // Sumar puntos
  addPoints(points: number) {
    this.setTotalPoints(this.totalPoints + points);
  }

  // Restar puntos
  subtractPoints(points: number) {
    this.setTotalPoints(this.totalPoints - points);
  }
}

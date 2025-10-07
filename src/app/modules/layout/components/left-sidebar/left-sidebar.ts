import { CommonModule } from '@angular/common';
import { Component, OnInit, output } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface FilterOption {
  type: 'school' | 'park' | 'hospital' | 'beach' | 'market';
  label: string;
  emoji: string;
  color: string;
  active: boolean;
}

@Component({
  selector: 'app-left-sidebar',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './left-sidebar.html',
  styleUrl: './left-sidebar.scss'
})
export class LeftSidebar implements OnInit {
  isOpen = true;
  isTutor = false;
  selectedOption: string | null = null;
  filterChange = output<{ type: string; active: boolean }>();

  filterOptions: FilterOption[] = [
    { type: 'school', label: 'Colegios', emoji: '🏫', color: '#3B82F6', active: true },
    { type: 'park', label: 'Parques', emoji: '🌳', color: '#10B981', active: true },
    { type: 'hospital', label: 'Centros de Salud', emoji: '🏥', color: '#EF4444', active: true },
    { type: 'beach', label: 'Playas', emoji: '🏖️', color: '#06B6D4', active: true },
    { type: 'market', label: 'Mercados', emoji: '🛒', color: '#F59E0B', active: true },
  ];

  private counts = {
    school: 3,
    park: 3,
    hospital: 2,
    beach: 2,
    market: 2
  };

  ngOnInit() {
    // Detecta móvil por ancho de pantalla o por soporte táctil
    const isMobile =
      window.innerWidth < 768 ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0);

    if (isMobile) {
      this.isOpen = false;
    }
  }

  toggleFilter(type: string) {
    const filter = this.filterOptions.find(f => f.type === type);
    if (filter) {
      filter.active = !filter.active;
      this.filterChange.emit({ type, active: filter.active });
    }
  }

  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  toggleAll() {
    const shouldActivate = !this.allActive();
    this.filterOptions.forEach(filter => {
      filter.active = shouldActivate;
      this.filterChange.emit({ type: filter.type, active: shouldActivate });
    });
  }

  allActive(): boolean {
    return this.filterOptions.every(f => f.active);
  }

  getFilterButtonClass(filter: FilterOption): string {
    return filter.active
      ? 'bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200'
      : 'bg-gray-50 border-2 border-gray-200 opacity-60';
  }

  getCount(type: string): number {
    return this.counts[type as keyof typeof this.counts] || 0;
  }

  getTotalVisible(): number {
    return this.filterOptions
      .filter(f => f.active)
      .reduce((sum, f) => sum + this.getCount(f.type), 0);
  }
}

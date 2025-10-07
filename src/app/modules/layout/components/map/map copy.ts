import { CommonModule } from '@angular/common';
import { Component, OnInit, output, signal } from '@angular/core';
import { Global } from 'app/services/global';
import { NasaPowerResponse, NasaPowerService } from 'app/services/nasa-power-dav/nasapd';
import * as L from 'leaflet';
import 'leaflet.heat';
import { Subject } from 'rxjs';
import { switchMap, catchError, retry, debounceTime } from 'rxjs/operators';
import { of } from 'rxjs';

interface POI {
  id: number;
  name: string;
  type: 'school' | 'park' | 'hospital' | 'beach' | 'market';
  lat: number;
  lng: number;
  description?: string;
}

interface POIFilters {
  school: boolean;
  park: boolean;
  hospital: boolean;
  beach: boolean;
  market: boolean;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapC implements OnInit {
  map!: L.Map;
  characterMarker!: L.Marker;
  private poiMarkers: Map<number, L.Marker> = new Map();

  private initialBounds = L.latLngBounds([-12.3900, -76.7850], [-12.3810, -76.7780]);
  private expandedBounds = L.latLngBounds([-12.42, -76.82], [-12.35, -76.74]);
  
  // Filtros reactivos
  filters = signal<POIFilters>({
    school: true,
    park: true,
    hospital: true,
    beach: true,
    market: true,
  });

  // Datos para el mapa de calor (temperatura simulada en diferentes puntos)
  private heatmapData: [number, number, number][] = [
    // [lat, lng, intensidad (0-1)]
    [-12.3856, -76.7815, 0.8],  // Centro - alta temperatura
    [-12.3875, -76.7830, 0.6],  // Norte
    [-12.3850, -76.7795, 0.7],  // Este
    [-12.3865, -76.7810, 0.5],  // Noreste
    [-12.3860, -76.7820, 0.9],  // Centro-norte - muy alta
    [-12.3880, -76.7805, 0.4],  // Norte-este
    [-12.3845, -76.7840, 0.3],  // Oeste - baja
    [-12.3870, -76.7815, 0.6],  // Norte-centro
    [-12.3855, -76.7825, 0.7],  // Centro-oeste
    [-12.3890, -76.7790, 0.5],  // Sur-este
    [-12.3840, -76.7850, 0.2],  // Oeste - muy baja
    [-12.3863, -76.7818, 0.8],  // Centro
    [-12.3885, -76.7800, 0.6],  // Sur
    [-12.3848, -76.7808, 0.7],  // Este-centro
    [-12.3872, -76.7822, 0.5],  // Norte-oeste
  ];

  private heatmapLayer!: any;
  showHeatmap = signal<boolean>(false);

  // Nuevas propiedades para manejo de drag vs click
  private isDragging = false;
  private dragStartTime = 0;
  private dragStartPos = { x: 0, y: 0 };
  private readonly DRAG_THRESHOLD = 15; // pixels (aumentado para móviles)
  private readonly DRAG_TIME_THRESHOLD = 300; // ms (aumentado para móviles)
  
  // Manejo de estado de carga y errores
  private isLoadingData = signal<boolean>(false);
  private consecutiveErrors = 0;
  private readonly MAX_RETRY_ATTEMPTS = 2;

  addHeatmapLayer() {
    // Crear capa de mapa de calor
    this.heatmapLayer = (L as any).heatLayer(this.heatmapData, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    });

    // Agregar al mapa si está activado
    if (this.showHeatmap()) {
      this.heatmapLayer.addTo(this.map);
    }
  }

  // Agregar este método para actualizar el heatmap con datos reales
  updateHeatmapWithRealData(lat: number, lng: number, temperature: number) {
    // Normalizar temperatura (asumiendo rango 10-35°C)
    const intensity = Math.max(0, Math.min(1, (temperature - 10) / 25));
    
    // Agregar o actualizar punto en el heatmap
    const existingIndex = this.heatmapData.findIndex(
      point => Math.abs(point[0] - lat) < 0.001 && Math.abs(point[1] - lng) < 0.001
    );
    
    if (existingIndex >= 0) {
      this.heatmapData[existingIndex][2] = intensity;
    } else {
      this.heatmapData.push([lat, lng, intensity]);
    }
    
    // Recrear la capa del heatmap
    if (this.map.hasLayer(this.heatmapLayer)) {
      this.map.removeLayer(this.heatmapLayer);
    }
    
    this.heatmapLayer = (L as any).heatLayer(this.heatmapData, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        1.0: 'red'
      }
    });
    
    if (this.showHeatmap()) {
      this.heatmapLayer.addTo(this.map);
    }
  }

  toggleHeatmap() {
    this.showHeatmap.update(show => !show);
    
    if (this.showHeatmap()) {
      if (!this.map.hasLayer(this.heatmapLayer)) {
        this.heatmapLayer.addTo(this.map);
      }
    } else {
      if (this.map.hasLayer(this.heatmapLayer)) {
        this.map.removeLayer(this.heatmapLayer);
      }
    }
  }

  // Puntos de interés de Santa María del Mar
  private pois: POI[] = [
    // Colegios
    {
      id: 1,
      name: 'I.E. Santa María del Mar',
      type: 'school',
      lat: -12.3825,
      lng: -76.7840,
      description: 'Institución educativa pública'
    },
    {
      id: 2,
      name: 'Colegio Particular San José',
      type: 'school',
      lat: -12.3850,
      lng: -76.7795,
      description: 'Colegio privado de educación básica'
    },
    {
      id: 3,
      name: 'I.E. Inicial Los Delfines',
      type: 'school',
      lat: -12.3865,
      lng: -76.7810,
      description: 'Educación inicial'
    },
    
    // Parques
    {
      id: 4,
      name: 'Parque Central',
      type: 'park',
      lat: -12.3860,
      lng: -76.7820,
      description: 'Parque principal del distrito'
    },
    {
      id: 5,
      name: 'Parque Infantil',
      type: 'park',
      lat: -12.3880,
      lng: -76.7805,
      description: 'Área recreativa para niños'
    },
    {
      id: 6,
      name: 'Parque Ecológico Costero',
      type: 'park',
      lat: -12.3845,
      lng: -76.7840,
      description: 'Parque con vista al mar'
    },

    // Hospitales/Centros de Salud
    {
      id: 7,
      name: 'Centro de Salud Santa María',
      type: 'hospital',
      lat: -12.3870,
      lng: -76.7815,
      description: 'Centro de atención primaria'
    },
    {
      id: 8,
      name: 'Posta Médica Municipal',
      type: 'hospital',
      lat: -12.3855,
      lng: -76.7825,
      description: 'Atención de emergencias'
    },

    // Playas
    {
      id: 9,
      name: 'Playa Santa María',
      type: 'beach',
      lat: -12.3890,
      lng: -76.7790,
      description: 'Playa principal del distrito'
    },
    {
      id: 10,
      name: 'Playa Naplo',
      type: 'beach',
      lat: -12.3840,
      lng: -76.7850,
      description: 'Playa tranquila'
    },

    // Mercados
    {
      id: 11,
      name: 'Mercado Municipal',
      type: 'market',
      lat: -12.3863,
      lng: -76.7818,
      description: 'Mercado de abastos'
    },
    {
      id: 12,
      name: 'Mercado de Pescadores',
      type: 'market',
      lat: -12.3885,
      lng: -76.7800,
      description: 'Venta de productos del mar'
    },
  ];

  private newRequest$ = new Subject<{ lat: number; lng: number }>();
  totalPoints = 0;

  constructor(private nasaPd: NasaPowerService, private _global: Global) {}

  getQuestion = output<any>();

  // Agregar esta propiedad al inicio de la clase
  isMapUnlocked = signal<boolean>(false);

  // Agregar este método
  toggleMapLock() {
    this.isMapUnlocked.update(locked => !locked);
    
    if (this.isMapUnlocked()) {
      // Desbloquear: remover límites y permitir exploración mundial
      this.map.setMaxBounds(undefined as any);
      this.map.setMinZoom(2);
      this.map.setMaxZoom(19);
    } else {
      // Bloquear: volver a Santa María del Mar
      this.map.setMaxBounds(this.initialBounds);
      this.map.setMinZoom(13);
      this.map.flyTo([-12.3856, -76.7815], 16, { duration: 1.5 });
    }
  }

  // Método para manejar cambios desde el componente de filtros
  onFilterChange(event: { type: string; active: boolean }) {
    this.filters.update(current => ({
      ...current,
      [event.type]: event.active
    }));
    this.refreshPOIMarkers();
  }

  ngOnInit() {
    const lat = -12.3856;
    const lon = -76.7815;
    this.initMap(lat, lon);
    this.placeCharacter(lat, lon);
    this.addPOIMarkers();
    this.addHeatmapLayer();
    this.setupRequestStream();
    this.enableMapClickMove();
    this.toggleHeatmap();

    // Suscripción al totalPoints global
    this._global.totalPoints$.subscribe(value => {
      this.totalPoints = value;
      this.updateCharacterIcon();
    });
  }

  updateCharacterIcon() {
    if (!this.characterMarker) return;

    let iconUrl = '/characters/curious.png';

    if (this.totalPoints < 100) {
      iconUrl = '/characters/curious.png';
    } else if (this.totalPoints < 200) {
      iconUrl = '/characters/explorer.png';
    } else if (this.totalPoints >= 300) {
      iconUrl = '/characters/scientist.png';
    }

    const newIcon = L.icon({
      iconUrl,
      iconSize: [120, 120],
      iconAnchor: [30, 55],
      popupAnchor: [0, -50],
    });

    this.characterMarker.setIcon(newIcon);
  }

  initMap(lat: number, lon: number) {
    this.map = L.map('map', {
      center: [lat, lon],
      zoom: 16,
      minZoom: 13,
      maxZoom: 19,
      zoomControl: true,
      dragging: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      touchZoom: true,
      boxZoom: true,
      keyboard: true,
      inertia: true,
      tapTolerance: 15, // Tolerancia para tap en móviles
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.setMaxBounds(this.initialBounds);

    L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'invisible-marker',
        html: '',
        iconSize: [0, 0],
      }),
    }).addTo(this.map)
      .bindPopup('<b>Santa María del Mar</b><br>Distrito costero de Lima, Perú.')
      .openPopup();
  }

  placeCharacter(lat: number, lon: number) {
    const characterIcon = L.icon({
      iconUrl: '/characters/curious.png',
      iconSize: [120, 120],
      iconAnchor: [30, 55],
      popupAnchor: [0, -50],
    });

    this.characterMarker = L.marker([lat, lon], { icon: characterIcon })
      .addTo(this.map)
      .bindPopup('👋 ¡Hola! Soy tu personaje.');
    this.characterMarker.openPopup();
  }

  addPOIMarkers() {
    this.pois.forEach(poi => {
      const icon = this.getPOIIcon(poi.type);
      const marker = L.marker([poi.lat, poi.lng], { icon })
        .bindPopup(`
          <div class="poi-popup">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${this.getPOIEmoji(poi.type)} ${poi.name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">${poi.description || ''}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Tipo: ${this.getPOITypeLabel(poi.type)}</p>
          </div>
        `);

      this.poiMarkers.set(poi.id, marker);
      
      if (this.filters()[poi.type]) {
        marker.addTo(this.map);
      }
    });
  }

  getPOIIcon(type: string): any {
    const iconConfig = {
      school: { color: '#3B82F6', emoji: '🏫' },
      park: { color: '#10B981', emoji: '🌳' },
      hospital: { color: '#EF4444', emoji: '🏥' },
      beach: { color: '#06B6D4', emoji: '🏖️' },
      market: { color: '#F59E0B', emoji: '🛒' },
    };

    const config = iconConfig[type as keyof typeof iconConfig] || iconConfig.park;

    return L.divIcon({
      html: `
        <div style="
          background-color: ${config.color};
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          font-size: 16px;
        ">
          ${config.emoji}
        </div>
      `,
      className: 'custom-poi-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  }

  getPOIEmoji(type: string): string {
    const emojis = {
      school: '🏫',
      park: '🌳',
      hospital: '🏥',
      beach: '🏖️',
      market: '🛒',
    };
    return emojis[type as keyof typeof emojis] || '📍';
  }

  getPOITypeLabel(type: string): string {
    const labels = {
      school: 'Colegio',
      park: 'Parque',
      hospital: 'Centro de Salud',
      beach: 'Playa',
      market: 'Mercado',
    };
    return labels[type as keyof typeof labels] || 'Lugar';
  }

  updateFilters(newFilters: Partial<POIFilters>) {
    this.filters.update(current => ({ ...current, ...newFilters }));
    this.refreshPOIMarkers();
  }

  toggleFilter(type: keyof POIFilters) {
    this.filters.update(current => ({
      ...current,
      [type]: !current[type]
    }));
    this.refreshPOIMarkers();
  }

  private refreshPOIMarkers() {
    const currentFilters = this.filters();
    
    this.pois.forEach(poi => {
      const marker = this.poiMarkers.get(poi.id);
      if (!marker) return;

      if (currentFilters[poi.type]) {
        if (!this.map.hasLayer(marker)) {
          marker.addTo(this.map);
        }
      } else {
        if (this.map.hasLayer(marker)) {
          this.map.removeLayer(marker);
        }
      }
    });
  }

  setupRequestStream() {
    this.newRequest$.pipe(
      debounceTime(100), // Evitar múltiples requests rápidos
      switchMap(({ lat, lng }) => {
        // Si ya hay una carga en proceso, ignorar
        if (this.isLoadingData()) {
          return of(null);
        }

        this.isLoadingData.set(true);
        this.characterMarker.bindPopup('🔄 Cargando datos...').openPopup();
        
        return this.nasaPd.getData(lat, lng).pipe(
          retry({
            count: this.MAX_RETRY_ATTEMPTS,
            delay: 1000, // Esperar 1 segundo entre reintentos
          }),
          catchError((error) => {
            console.error('Error NASA POWER:', error);
            this.consecutiveErrors++;
            
            // Mostrar mensaje más informativo según el error
            let errorMsg = '⚠️ Error al consultar datos climáticos.';
            if (this.consecutiveErrors > 2) {
              errorMsg += '<br><small>Intenta en otra ubicación o espera un momento.</small>';
            }
            
            this.characterMarker.bindPopup(errorMsg).openPopup();
            this.isLoadingData.set(false);
            
            // Devolver null para continuar el stream
            return of(null);
          })
        );
      })
    ).subscribe({
      next: (res: any) => {
        this.isLoadingData.set(false);
        
        if (!res) {
          // Request fue cancelado o hubo error
          return;
        }

        if (res.code === 200 && res.data) {
          // Resetear contador de errores en éxito
          this.consecutiveErrors = 0;
          
          console.log(JSON.stringify(res.data));
          const popupContent = `
            <b>Datos NASA POWER DAV</b><br>
            🌡️ Temp: ${res.data.temperature} °C<br>
            ☀️ Radiación: ${res.data.solar_radiation}<br>
            💧 Humedad: ${res.data.humidity}%<br>
            💨 Viento: ${res.data.wind_speed} m/s<br>
            🧭 Dirección: ${res.data._arrays?.WD2M?.slice(-1)[0]?.value ?? 'N/A'}<br>
            ⚖️ Presión: ${res.data.pressure} kPa
          `;
          this.getQuestion.emit(res.data);
          this.characterMarker.bindPopup(popupContent).openPopup();
          this.updateHeatmapWithRealData(
            res.data.coordenates.lat, 
            res.data.coordenates.lon, 
            res.data.temperature
          );
        } else {
          this.characterMarker.bindPopup('⚠️ No se pudieron obtener datos climáticos.').openPopup();
        }
      }
    });
  }

  enableMapClickMove() {
    let startPos: { x: number; y: number } | null = null;
    let startTime = 0;
    let hasMoved = false;

    // Manejador unificado para el inicio (mouse o touch)
    const handleStart = (clientX: number, clientY: number) => {
      startPos = { x: clientX, y: clientY };
      startTime = Date.now();
      hasMoved = false;
      this.isDragging = false;
    };

    // Manejador unificado para el movimiento
    const handleMove = (clientX: number, clientY: number) => {
      if (!startPos) return;

      const distance = Math.sqrt(
        Math.pow(clientX - startPos.x, 2) +
        Math.pow(clientY - startPos.y, 2)
      );

      if (distance > this.DRAG_THRESHOLD) {
        hasMoved = true;
        this.isDragging = true;
      }
    };

    // Manejador unificado para el fin (mouse o touch)
    const handleEnd = (latlng: L.LatLng) => {
      const duration = Date.now() - startTime;
      
      // Solo procesar si fue un tap/click válido
      if (!hasMoved && 
          duration < this.DRAG_TIME_THRESHOLD && 
          !this.isLoadingData()) {
        console.log('Click válido detectado:', latlng);
        this.animateMarkerTo(latlng.lat, latlng.lng);
        this.newRequest$.next({ lat: latlng.lat, lng: latlng.lng });
      }

      // Reset
      startPos = null;
      startTime = 0;
      hasMoved = false;
      this.isDragging = false;
    };

    // Eventos para MOUSE (desktop)
    this.map.on('mousedown', (e: L.LeafletMouseEvent) => {
      handleStart(e.originalEvent.clientX, e.originalEvent.clientY);
    });

    this.map.on('mousemove', (e: L.LeafletMouseEvent) => {
      handleMove(e.originalEvent.clientX, e.originalEvent.clientY);
    });

    this.map.on('mouseup', (e: L.LeafletMouseEvent) => {
      handleEnd(e.latlng);
    });

    // Eventos para TOUCH (móviles)
    const mapContainer = this.map.getContainer();
    
    mapContainer.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) { // Solo un dedo
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }
    }, { passive: false }); // Cambiado a false para poder prevenir

    mapContainer.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
        
        // Prevenir pull-to-refresh solo si el usuario está arrastrando el mapa
        if (hasMoved) {
          e.preventDefault();
        }
      }
    }, { passive: false }); // Cambiado a false para poder prevenir

    mapContainer.addEventListener('touchend', (e: TouchEvent) => {
      if (e.changedTouches.length === 1 && startPos) {
        const touch = e.changedTouches[0];
        // Convertir posición del touch a coordenadas del mapa
        const point = this.map.containerPointToLatLng(
          L.point(touch.clientX, touch.clientY)
        );
        handleEnd(point);
      }
    }, { passive: true });
  }

  animateMarkerTo(targetLat: number, targetLng: number) {
    if (!this.characterMarker) return;

    const start = this.characterMarker.getLatLng();
    const steps = 60;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      const lat = start.lat + ((targetLat - start.lat) * current) / steps;
      const lng = start.lng + ((targetLng - start.lng) * current) / steps;
      this.characterMarker.setLatLng([lat, lng]);
      
      if (current >= steps) {
        clearInterval(interval);
      }
    }, 16);
  }

  expandView() {
    this.map.setMinZoom(14);
    this.map.setMaxBounds(this.expandedBounds);
    this.map.flyToBounds(this.expandedBounds, { padding: [30, 30] });
  }

  ngOnDestroy() {
    this.newRequest$.complete();
    if (this.map) {
      this.map.remove();
    }
  }
}
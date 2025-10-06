import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, signal, viewChild, ViewChild } from '@angular/core';
import { MapC } from './components/map/map';
import { Notification } from './components/notification/notification';
import { RightSidebar } from './components/right-sidebar/right-sidebar';
import { LeftSidebar } from './components/left-sidebar/left-sidebar';
import { SearchBar } from './components/search-bar/search-bar';
import { Load } from '../../shared/components/load/load';
import { NasaPowerService } from '../../services/nasa-power-dav/nasapd';
import { MiniGame } from './components/mini-game/mini-game';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, MapC,Notification,RightSidebar,LeftSidebar,SearchBar,
    Load,MiniGame
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout implements OnInit, AfterViewInit{

  isLoading = signal<boolean>(true);
  miniGameComponent = viewChild(MiniGame);
  mapComponent = viewChild(MapC);

  constructor(private _nasaPd:NasaPowerService){}
  ngOnInit(): void {
    setTimeout(() => {
      this.isLoading.set(false);
    }, 5000);
  }
  ngAfterViewInit(): void {
    this.attemptAutoplay();

  }

  sendEvent(event:any){
    this.mapComponent()?.onFilterChange(event)
  }
  
  getQuestion(coords:any){
    this.miniGameComponent()?.getQuestion(coords)
  } 

  showIntroOverlay = true;

  hideIntroOverlay() {
    this.showIntroOverlay = false;
  }
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  // URL del archivo de música (asume que está en src/assets/)
  audioUrl: string = 'music/sound_map.mp3';

  // Variables de estado
  showUnmutePrompt: boolean = false;
  audioBlocked: boolean = false;

  // Escuchar el primer clic o toque en cualquier parte del documento
  @HostListener('document:click', ['$event'])
  onDocumentClick(event:any) {
    // Si la música está bloqueada y hay un clic, intentamos reproducir
    if (this.showUnmutePrompt) {
      this.unmuteAndPlay();
    }
  }

  /**
   * Intenta iniciar la reproducción automática al cargar el componente.
   */
  attemptAutoplay(): void {
    const audio: HTMLAudioElement = this.audioPlayerRef.nativeElement;

    // Los navegadores permiten 'autoplay' solo si el audio está silenciado.
    // audio.muted = true;
    audio.volume = 0.05
    // Devolvemos el control del flujo a Angular después de un micro-tiempo
    // para asegurar que el DOM esté completamente listo.
    setTimeout(() => {
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // El autoplay silencioso fue exitoso.
            console.log("Autoplay exitoso (iniciado en silencio).");
            // Podemos mostrar un prompt sutil para que el usuario desmutee
            this.showUnmutePrompt = true;
            this.audioBlocked = false;
          })
          .catch(error => {
            // La promesa falló, el audio está bloqueado (¡suele pasar!)
            console.warn("Autoplay bloqueado:", error);
            this.showUnmutePrompt = true;
            this.audioBlocked = true;
          });
      }
    }, 100);
  }

  /**
   * Activa el sonido y reproduce la música después de la interacción del usuario.
   */
  unmuteAndPlay(): void {
    const audio: HTMLAudioElement = this.audioPlayerRef.nativeElement;

    // Desactivamos el prompt, ya que el usuario ya interactuó
    this.showUnmutePrompt = false;

    // Quitamos el silencio y ajustamos el volumen
    audio.muted = false;

    // Si está pausado (porque fue bloqueado), lo intentamos de nuevo
    if (audio.paused) {
      audio.play().catch(error => {
        console.error("No se pudo reproducir después del clic:", error);
      });
    }
  }
 
}

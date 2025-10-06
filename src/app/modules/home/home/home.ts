import { CommonModule } from '@angular/common';
import { Component, ElementRef, AfterViewInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import * as THREE from 'three';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements AfterViewInit, OnDestroy {

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly ROTATION_SPEED = 0.001;
  private readonly ZOOM_SPEED = 0.008;
  private readonly BASE_RADIUS = 3;
  private readonly FINAL_RADIUS = 0.5;
  private readonly CAMERA_LERP = 0.05;
  private readonly TARGET_ROUTE = '/layout';

  private readonly DESTINATION = {
    lat: -12.0649,
    lon: -77.0223,
    country: 'peru',
    region: 'Santa Maria del Mar'
  };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private earth!: THREE.Mesh;
  private clouds!: THREE.Mesh;
  private puzzlePiece!: THREE.Group;
  private frameId: number = 0;
  isZooming: boolean = false;
  zoomProgress = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private glowIntensity = 0;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private currentZoom = 3; // Posición Z inicial de la cámara
  private readonly MIN_ZOOM = 1.5; // Más cerca
  private readonly MAX_ZOOM = 5; // Más lejos

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    this.initScene();
    this.animate();
    this.setupClickHandler();
    this.setupDragHandler();
    this.setupZoomHandler();
    this.attemptAutoplay();

  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
    window.removeEventListener('click', this.onCanvasClick);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000000, 50, 100);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 3;

    const loader = new THREE.TextureLoader();
    
    // Texturas mejoradas de alta calidad
    const earthTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
    const normalTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
    const specularTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');
    const cloudsTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png');

    // Tierra con texturas mejoradas
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.MeshPhongMaterial({ 
      map: earthTexture,
      normalMap: normalTexture,
      specularMap: specularTexture,
      specular: new THREE.Color(0x333333),
      shininess: 15
    });
    
    this.earth = new THREE.Mesh(geometry, material);
    this.scene.add(this.earth);

    // Capa de nubes
    const cloudsGeometry = new THREE.SphereGeometry(1.01, 128, 128);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });
    this.clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    this.scene.add(this.clouds);

    // Iluminación mejorada
    const ambientLight = new THREE.AmbientLight(0x333333, 1);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);

    // Luz de relleno suave
    const fillLight = new THREE.DirectionalLight(0x4477ff, 0.3);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);

    this.createPuzzlePiece();

    window.addEventListener('resize', this.onResize);
  }

  private createPuzzlePiece(): void {
    this.puzzlePiece = new THREE.Group();

    // Forma mejorada de la pieza de puzzle
    const shape = new THREE.Shape();
    
    // Base rectangular con esquinas redondeadas
    const width = 0.12;
    const height = 0.10;
    const radius = 0.015;
    
    shape.moveTo(-width/2 + radius, -height/2);
    shape.lineTo(width/2 - radius, -height/2);
    shape.quadraticCurveTo(width/2, -height/2, width/2, -height/2 + radius);
    
    // Diente superior (protuberancia)
    shape.lineTo(width/2, -0.01);
    shape.bezierCurveTo(width/2 + 0.02, 0, width/2 + 0.02, 0.03, width/2, 0.04);
    
    shape.lineTo(width/2, height/2 - radius);
    shape.quadraticCurveTo(width/2, height/2, width/2 - radius, height/2);
    shape.lineTo(-width/2 + radius, height/2);
    shape.quadraticCurveTo(-width/2, height/2, -width/2, height/2 - radius);
    
    // Diente izquierdo (hendidura)
    shape.lineTo(-width/2, 0.02);
    shape.bezierCurveTo(-width/2 - 0.025, 0.01, -width/2 - 0.025, -0.02, -width/2, -0.03);
    
    shape.lineTo(-width/2, -height/2 + radius);
    shape.quadraticCurveTo(-width/2, -height/2, -width/2 + radius, -height/2);

    // Extrusión de la pieza con más profundidad
    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.003,
      bevelSegments: 5
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Material mejorado con degradado y brillo
    const material = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0xff4500,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.98
    });

    const piece = new THREE.Mesh(geometry, material);
    this.puzzlePiece.add(piece);

    // Borde brillante exterior más grueso
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      linewidth: 3
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    this.puzzlePiece.add(edges);

    // Luz puntual más intensa
    const pointLight = new THREE.PointLight(0xff6b35, 2, 0.4);
    pointLight.position.set(0, 0, 0.06);
    this.puzzlePiece.add(pointLight);

    // Partículas brillantes alrededor
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 30;
    const positions = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i += 3) {
      const angle = (i / 3) * (Math.PI * 2 / particlesCount);
      const distance = 0.2 + Math.random() * 0.05;
      positions[i] = Math.cos(angle) * distance;
      positions[i + 1] = Math.sin(angle) * distance;
      positions[i + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 0.01,
      transparent: true,
      opacity: 0.8
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    this.puzzlePiece.add(particles);

    // Posicionar en coordenadas de Santa María del Mar
    this.positionPuzzleOnEarth();
    this.puzzlePiece.userData = { clickable: true };
    this.earth.add(this.puzzlePiece);
  }

  private positionPuzzleOnEarth(): void {
    const phi = (90 - this.DESTINATION.lat) * (Math.PI / 180);
    const theta = (this.DESTINATION.lon + 180) * (Math.PI / 180);
    
    const x = -1.03 * Math.sin(phi) * Math.cos(theta);
    const y = 1.03 * Math.cos(phi);
    const z = 1.03 * Math.sin(phi) * Math.sin(theta);
    
    this.puzzlePiece.position.set(x, y, z);
    
    // Orientar la pieza hacia afuera del planeta
    const normal = new THREE.Vector3(x, y, z).normalize();
    this.puzzlePiece.lookAt(
      this.puzzlePiece.position.x + normal.x,
      this.puzzlePiece.position.y + normal.y,
      this.puzzlePiece.position.z + normal.z
    );
  }

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);

    if (!this.isZooming) {
      this.earth.rotation.y += this.ROTATION_SPEED;
      this.clouds.rotation.y += this.ROTATION_SPEED * 1.2;
      this.animatePuzzlePiece();
      
      // Aplicar zoom suave de la cámara
      this.camera.position.z += (this.currentZoom - this.camera.position.z) * 0.1;
    } else {
      this.zoomToTarget();
    }

    this.renderer.render(this.scene, this.camera);
  };

  private animatePuzzlePiece(): void {
    if (!this.puzzlePiece) return;
    
    const time = Date.now() * 0.002;
    
    // Efecto de levitación suave
    const hoverOffset = Math.sin(time) * 0.012;
    const phi = (90 - this.DESTINATION.lat) * (Math.PI / 180);
    const theta = (this.DESTINATION.lon + 180) * (Math.PI / 180);
    const baseRadius = 1.03 + hoverOffset;
    
    const x = -baseRadius * Math.sin(phi) * Math.cos(theta);
    const y = baseRadius * Math.cos(phi);
    const z = baseRadius * Math.sin(phi) * Math.sin(theta);
    
    this.puzzlePiece.position.set(x, y, z);
    
    // Pulso de brillo más intenso
    this.glowIntensity = 0.6 + Math.sin(time * 2) * 0.4;
    const material = (this.puzzlePiece.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = this.glowIntensity;

    // Animar partículas
    const particles = this.puzzlePiece.children[3];
    if (particles) {
      particles.rotation.z -= 0.01;
    }

    // Rotación suave de la pieza
    this.puzzlePiece.rotation.z += 0.003;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  // ============================
  // 🖱️ INTERACCIÓN CON CLICKS Y DRAG
  // ============================

  private setupClickHandler(): void {
    this.canvasRef.nativeElement.addEventListener('click', this.onCanvasClick);
  }

  private setupDragHandler(): void {
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
  }

  private setupZoomHandler(): void {
    window.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onWheel = (event: WheelEvent) => {
    // Prevenir scroll de la página
    event.preventDefault();
    
    // Solo permitir zoom manual cuando NO está haciendo zoom automático
    if (this.isZooming) return;

    // Calcular el cambio de zoom (deltaY positivo = alejar, negativo = acercar)
    const zoomSpeed = 0.001;
    const delta = event.deltaY * zoomSpeed;
    
    // Aplicar zoom con límites
    this.currentZoom = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.currentZoom + delta));
    
    console.log('Zoom actual:', this.currentZoom.toFixed(2));
  };

  private onMouseDown = (event: MouseEvent) => {
    if (this.isZooming) return;
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging || this.isZooming) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    // Rotar la tierra basado en el movimiento del mouse
    this.earth.rotation.y += deltaX * 0.005;
    this.earth.rotation.x += deltaY * 0.005;
    
    // Limitar la rotación en X para evitar que se voltee completamente
    this.earth.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.earth.rotation.x));

    // Rotar las nubes también
    this.clouds.rotation.y += deltaX * 0.005;
    this.clouds.rotation.x += deltaY * 0.005;
    this.clouds.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.clouds.rotation.x));

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onCanvasClick = (event: MouseEvent) => {
    // Solo detectar clicks cuando NO está haciendo zoom y NO está arrastrando
    if (this.isZooming || this.isDragging) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Solo detectar intersección con la pieza sólida (primer hijo del grupo)
    const pieceMesh = this.puzzlePiece.children[0];
    const intersects = this.raycaster.intersectObject(pieceMesh, false);

    // Solo iniciar el viaje si se hizo click EXACTAMENTE en la pieza del puzzle
    if (intersects.length > 0) {
      console.log('¡Click detectado en la pieza del puzzle!');
      this.startJourney();
    }
  };

  // ============================
  // 🚀 ZOOM Y REDIRECCIÓN
  // ============================

  startJourney(): void {
    console.log('¡Click en el marcador! Iniciando viaje...');
    this.isZooming = true;
    this.zoomProgress = 0;
  }

  private zoomToTarget(): void {
    this.zoomProgress = Math.min(1, this.zoomProgress + this.ZOOM_SPEED);
    
    // Obtener la posición EXACTA de la pieza del puzzle en el espacio mundial
    const puzzleWorldPosition = new THREE.Vector3();
    this.puzzlePiece.getWorldPosition(puzzleWorldPosition);
    
    // Calcular vector de dirección desde la pieza hacia afuera
    const direction = puzzleWorldPosition.clone().normalize();
    
    // Interpolar la distancia
    const startDistance = this.BASE_RADIUS;
    const endDistance = this.FINAL_RADIUS;
    const currentDistance = startDistance - (startDistance - endDistance) * this.zoomProgress;
    
    // Posición objetivo: desde la pieza hacia afuera
    const target = direction.multiplyScalar(currentDistance);

    // Mover cámara suavemente
    this.camera.position.lerp(target, this.CAMERA_LERP);
    
    // Enfocar directamente a la pieza del puzzle
    this.camera.lookAt(puzzleWorldPosition);
    
    // Rotar tierra y nubes durante el zoom (más lento)
    this.earth.rotation.y += this.ROTATION_SPEED * 1.5;
    this.clouds.rotation.y += this.ROTATION_SPEED * 1.8;

    // Aumentar brillo de la pieza durante el zoom
    if (this.puzzlePiece) {
      const material = (this.puzzlePiece.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.6 + this.zoomProgress * 1.5;
      
      // Escalar la pieza durante el zoom
      const scale = 1 + this.zoomProgress * 0.5;
      this.puzzlePiece.scale.set(scale, scale, scale);
    }

    // Completar zoom y redirigir SOLO cuando el zoom ha terminado
    if (this.zoomProgress >= 1 && this.camera.position.distanceTo(target) < 0.05) {
      console.log('Zoom completado. Redirigiendo a /map...');
      this.redirectToMap();
    }
  }

  private redirectToMap(): void {
    const { country, region } = this.DESTINATION;
    const url = `${this.TARGET_ROUTE}?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}`;
    console.log('Navegando a:', url);
    this.router.navigateByUrl(url);
  }



  showIntroOverlay = true;
  
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  // URL del archivo de música
  audioUrl: string = 'music/soundtrack.mp3';

  // Variables de estado
  showUnmutePrompt: boolean = false;
  audioBlocked: boolean = false;
  isMuted: boolean = true; // Comienza muteado para permitir autoplay

  // ngAfterViewInit() {
  //   // Intentar reproducir automáticamente después de que la vista esté lista
  //   this.attemptAutoplay();
  // }

  hideIntroOverlay() {
    this.showIntroOverlay = false;
    // Intentar reproducir al cerrar el overlay
    this.unmuteAndPlay();
  }

  // Escuchar el primer clic en el prompt de audio
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: any) {
    // Solo si el prompt está visible
    if (this.showUnmutePrompt) {
      this.unmuteAndPlay();
    }
  }

  toggleMute() {
    const audio: HTMLAudioElement = this.audioPlayerRef.nativeElement;
    this.isMuted = !this.isMuted;
    audio.muted = this.isMuted;
    
    console.log('Audio', this.isMuted ? 'silenciado' : 'activado');
  }

  unmute() {
    this.unmuteAndPlay();
  }

  attemptAutoplay(): void {
    const audio: HTMLAudioElement = this.audioPlayerRef.nativeElement;

    // Configurar volumen
    audio.volume = 0.2;
    
    // Los navegadores permiten autoplay solo si el audio está silenciado
    audio.muted = true;
    this.isMuted = true;

    // Esperar a que el DOM esté completamente listo
    setTimeout(() => {
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Autoplay exitoso (silenciado)
            console.log("Autoplay exitoso (iniciado en silencio).");
            this.showUnmutePrompt = true;
            this.audioBlocked = false;
          })
          .catch(error => {
            // Autoplay bloqueado por el navegador
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

    // Ocultar el prompt
    this.showUnmutePrompt = false;

    // Desactivar mute
    audio.muted = false;
    this.isMuted = false;

    // Asegurar que el volumen esté configurado
    audio.volume = 0.1;

    // Si está pausado, reproducir
    if (audio.paused) {
      audio.play().catch(error => {
        console.error("No se pudo reproducir después del clic:", error);
        // Si falla, mostrar el prompt nuevamente
        this.showUnmutePrompt = true;
      });
    }

    console.log("Audio activado y reproduciendo");
  }
}
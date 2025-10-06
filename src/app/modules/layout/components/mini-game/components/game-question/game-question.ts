// ============================================
// game-question.component.ts
// ============================================
import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ClimateQuizGenerator } from '@core/interfaces/generateQuestion';
import { Global } from 'app/services/global';

export interface inQuestion {
    id:            number;
    question:      string;
    alternatives:  inAnswer[];
    correctAnswer: inAnswer;
    points:        number;
}

export interface inAnswer {
    id:          number;
    description: string;
    color:       string;
}

interface GameProgress {
  currentQuestionIndex: number;
  totalPoints: number;
  isNew: boolean;
  answeredQuestions: number[];
}

@Component({
  selector: 'app-game-question',
  imports: [CommonModule],
  templateUrl: './game-question.html',
  styleUrl: './game-question.scss'
})
export class GameQuestion implements OnInit {
  questions = signal<inQuestion[]>([]);
  private quizGenerator = new ClimateQuizGenerator();

  actualQuestion = signal<inQuestion>({} as inQuestion);
  currentQuestionIndex = signal<number>(0);
  answeredQuestions = signal<number[]>([]);

  isNew = signal<boolean>(true);
  isMinimized = signal<boolean>(false);
  displayedText = signal<string>('');
  isTyping = signal<boolean>(false);
  showFeedback = signal<boolean>(false);
  isCorrect = signal<boolean>(false);
  allQuestionsCompleted = signal<boolean>(false);
  
  // Velocidad configurable (milisegundos por carácter)
  typingSpeed = 40;
  
  private currentText = '';
  private typingInterval: any;
  
  welcomeMessage = "Hola, soy Frank 🌱 tu asistente eco-amigable en Puzzle Maker. ¡Haz clic en el mapa para obtener preguntas sobre el clima!";
  completionMessage = "🎉 ¡Felicidades! Has completado todas las preguntas de esta ubicación. Selecciona otro punto del mapa para continuar tu aventura verde 🗺️";
  
  constructor(private _global:Global) {
    // Effect para detectar cambios en actualQuestion
    effect(() => {
      const question = this.actualQuestion();
      if (question && question.id && !this.isNew()) {
        this.typeText(question.question);
      }
    });


  }
  
  ngOnInit(): void {
    this.typeText(this.welcomeMessage);
  }
  
  /**
   * Método público que será llamado desde el componente del mapa
   * para generar y cargar nuevas preguntas basadas en datos climáticos
   */
  getQuestion(data: any): void {
    console.log("🌍 Data obtenida del API: ", data);
    
    // Generar nuevas preguntas
    const newQuestions = this.quizGenerator.generateQuestions(data);
    console.log("❓ Preguntas generadas: ", newQuestions);
    
    // Resetear el estado del juego
    this.questions.set(newQuestions);
    this.currentQuestionIndex.set(0);
    this.answeredQuestions.set([]);
    this.allQuestionsCompleted.set(false);
    this.isNew.set(false);
    this.showFeedback.set(false);
    
    // Expandir el panel si está minimizado
    this.isMinimized.set(false);
    
    // Cargar la primera pregunta
    if (newQuestions.length > 0) {
      this.loadCurrentQuestion();
    }
  }
  
  loadCurrentQuestion(): void {
    const index = this.currentQuestionIndex();
    if (index < this.questions().length) {
      this.actualQuestion.set(this.questions()[index]);
    } else {
      // Si terminó todas las preguntas, mostrar mensaje de completado
      this.allQuestionsCompleted.set(true);
      this.typeText(this.completionMessage);
    }
  }
  
  typeText(text: string): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    
    this.currentText = text;
    this.displayedText.set('');
    this.isTyping.set(true);
    
    let index = 0;
    this.typingInterval = setInterval(() => {
      if (index < this.currentText.length) {
        this.displayedText.update(current => current + this.currentText[index]);
        index++;
      } else {
        clearInterval(this.typingInterval);
        this.isTyping.set(false);
      }
    }, this.typingSpeed);
  }
  
  toggleMinimize(): void {
    this.isMinimized.update(val => !val);
  }
  
  handleStart(): void {
    // Ya no necesitamos este método porque las preguntas se cargan desde el mapa
    this.typeText("👆 Selecciona un punto en el mapa para comenzar tu aventura climática.");
  }
  
  onSelectAnswer(answer: inAnswer): void {
    if (this.isTyping() || this.showFeedback()) return;
    
    const currentQ = this.actualQuestion();
    const correct = answer.id === currentQ.correctAnswer.id;
    
    this.isCorrect.set(correct);
    this.showFeedback.set(true);
    
    if (correct) {
      this._global.addPoints(currentQ.points);
      this.answeredQuestions.update(arr => [...arr, currentQ.id]);
    }
    
    // Después de 2 segundos, ir a la siguiente pregunta
    setTimeout(() => {
      this.showFeedback.set(false);
      this.goToNextQuestion();
    }, 2000);
  }
  
  goToNextQuestion(): void {
    const nextIndex = this.currentQuestionIndex() + 1;
    
    if (nextIndex < this.questions().length) {
      this.currentQuestionIndex.set(nextIndex);
      this.loadCurrentQuestion();
    } else {
      // Mostrar mensaje de completado
      this.allQuestionsCompleted.set(true);
      this.typeText(this.completionMessage);
    }
  }
  
  skipQuestion(): void {
    if (this.isTyping()) return;
    this.goToNextQuestion();
  }
  
  resetToWelcome(): void {
    this.questions.set([]);
    this.currentQuestionIndex.set(0);
    this.answeredQuestions.set([]);
    this.allQuestionsCompleted.set(false);
    this.isNew.set(true);
    this.showFeedback.set(false);
    this.typeText(this.welcomeMessage);
  }
  
  ngOnDestroy(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
  }
  
  // Métodos auxiliares para el template
  getProgressPercentage(): number {
    const total = this.questions().length;
    return total > 0 ? (this.currentQuestionIndex() / total) * 100 : 0;
  }
  
  getRemainingQuestions(): number {
    return this.questions().length - this.currentQuestionIndex();
  }
  
  hasQuestions(): boolean {
    return this.questions().length > 0;
  }
}
import { ClimateData, inAnswer, inQuestion } from "./question";

export class ClimateQuizGenerator {
  private colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  generateQuestions(data: ClimateData): inQuestion[] {
    const questions: inQuestion[] = [];
    let questionId = 1;

    // Pool de preguntas disponibles
    const availableQuestions = [
      () => this.createTemperatureQuestion(questionId++, data),
      () => this.createTemperatureClassificationQuestion(questionId++, data),
      () => this.createHumidityQuestion(questionId++, data),
      () => this.createHumidityClassificationQuestion(questionId++, data),
      () => this.createWindSpeedQuestion(questionId++, data),
      () => this.createWindClassificationQuestion(questionId++, data),
      () => this.createTempRangeQuestion(questionId++, data),
      () => this.createComfortIndexQuestion(questionId++, data),
      () => this.createPressureQuestion(questionId++, data),
      () => this.createPressureInterpretationQuestion(questionId++, data),
      () => this.createSolarRadiationQuestion(questionId++, data),
      () => this.createSolarRadiationValueQuestion(questionId++, data),
    ];

    // Preguntas especiales que requieren datos históricos
    if (data._arrays?.T2M && data._arrays.T2M.length > 1) {
      availableQuestions.push(() => this.createTempTrendQuestion(questionId++, data));
    }
    
    if (data._arrays?.RH2M && data._arrays.RH2M.length > 1) {
      availableQuestions.push(() => this.createHumidityTrendQuestion(questionId++, data));
    }

    // Seleccionar aleatoriamente 7 preguntas del pool
    const selectedQuestions = this.selectRandomQuestions(availableQuestions, 7);
    
    selectedQuestions.forEach(questionFn => {
      questions.push(questionFn());
    });

    return questions;
  }

  private selectRandomQuestions(pool: Array<() => inQuestion>, count: number): Array<() => inQuestion> {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  private getRandomColors(count: number): string[] {
    const shuffled = [...this.colors].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // ==================== PREGUNTAS DE TEMPERATURA ====================

  private createTemperatureQuestion(id: number, data: ClimateData): inQuestion {
    const temp = data.temperature;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${temp.toFixed(1)}°C`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(temp + Math.random() * 4 + 2).toFixed(1)}°C`, color: colors[1] },
      { id: 3, description: `${(temp - Math.random() * 3 - 1).toFixed(1)}°C`, color: colors[2] },
      { id: 4, description: `${(temp + Math.random() * 6 + 4).toFixed(1)}°C`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es la temperatura actual en esta ubicación?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 10,
    };
  }

  private createTemperatureClassificationQuestion(id: number, data: ClimateData): inQuestion {
    const temp = data.temperature;
    const colors = this.getRandomColors(4);
    
    let classification: string;
    if (temp < 10) classification = 'Frío';
    else if (temp < 18) classification = 'Templado fresco';
    else if (temp < 24) classification = 'Templado cálido';
    else if (temp < 30) classification = 'Cálido';
    else classification = 'Muy cálido';

    const correctAnswer: inAnswer = {
      id: 1,
      description: classification,
      color: colors[0],
    };

    const allClassifications = ['Frío', 'Templado fresco', 'Templado cálido', 'Cálido', 'Muy cálido'];
    const otherOptions = allClassifications.filter(opt => opt !== classification);
    const selectedOthers = otherOptions.sort(() => Math.random() - 0.5).slice(0, 3);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: selectedOthers[0], color: colors[1] },
      { id: 3, description: selectedOthers[1], color: colors[2] },
      { id: 4, description: selectedOthers[2], color: colors[3] },
    ];

    return {
      id,
      question: `Con una temperatura de ${temp.toFixed(1)}°C, ¿cómo clasificarías el clima?`,
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 15,
    };
  }

  // ==================== PREGUNTAS DE HUMEDAD ====================

  private createHumidityQuestion(id: number, data: ClimateData): inQuestion {
    const humidity = data.humidity;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${humidity.toFixed(1)}%`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(humidity + Math.random() * 12 + 5).toFixed(1)}%`, color: colors[1] },
      { id: 3, description: `${(humidity - Math.random() * 10 - 3).toFixed(1)}%`, color: colors[2] },
      { id: 4, description: `${(humidity + Math.random() * 18 + 10).toFixed(1)}%`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es el porcentaje de humedad relativa actual?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 10,
    };
  }

  private createHumidityClassificationQuestion(id: number, data: ClimateData): inQuestion {
    const humidity = data.humidity;
    const colors = this.getRandomColors(4);
    
    let classification: string;
    if (humidity < 30) classification = 'Muy seco';
    else if (humidity < 50) classification = 'Seco';
    else if (humidity < 70) classification = 'Confortable';
    else if (humidity < 85) classification = 'Húmedo';
    else classification = 'Muy húmedo';

    const correctAnswer: inAnswer = {
      id: 1,
      description: classification,
      color: colors[0],
    };

    const allClassifications = ['Muy seco', 'Seco', 'Confortable', 'Húmedo', 'Muy húmedo'];
    const otherOptions = allClassifications.filter(opt => opt !== classification);
    const selectedOthers = otherOptions.sort(() => Math.random() - 0.5).slice(0, 3);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: selectedOthers[0], color: colors[1] },
      { id: 3, description: selectedOthers[1], color: colors[2] },
      { id: 4, description: selectedOthers[2], color: colors[3] },
    ];

    return {
      id,
      question: `Con ${humidity.toFixed(0)}% de humedad, el ambiente se considera:`,
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 15,
    };
  }

  private createHumidityTrendQuestion(id: number, data: ClimateData): inQuestion {
    const humidities = data._arrays.RH2M!;
    const colors = this.getRandomColors(4);
    
    const firstHumidity = humidities[0].value;
    const lastHumidity = humidities[humidities.length - 1].value;
    const change = lastHumidity - firstHumidity;

    let trend: string;
    if (change > 5) trend = 'Ha aumentado';
    else if (change < -5) trend = 'Ha disminuido';
    else trend = 'Se ha mantenido estable';

    const correctAnswer: inAnswer = {
      id: 1,
      description: trend,
      color: colors[0],
    };

    const otherOptions = ['Ha aumentado', 'Ha disminuido', 'Se ha mantenido estable'].filter(
      opt => opt !== trend
    );

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: otherOptions[0], color: colors[1] },
      { id: 3, description: otherOptions[1], color: colors[2] },
      { id: 4, description: 'Ha fluctuado mucho', color: colors[3] },
    ];

    return {
      id,
      question: '¿Cómo ha variado la humedad en los últimos días?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 20,
    };
  }

  // ==================== PREGUNTAS DE VIENTO ====================

  private createWindSpeedQuestion(id: number, data: ClimateData): inQuestion {
    const windSpeed = data.wind_speed;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${windSpeed.toFixed(2)} m/s`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(windSpeed + Math.random() * 2 + 1).toFixed(2)} m/s`, color: colors[1] },
      { id: 3, description: `${Math.max(0, windSpeed - Math.random() * 1.5).toFixed(2)} m/s`, color: colors[2] },
      { id: 4, description: `${(windSpeed + Math.random() * 3 + 2).toFixed(2)} m/s`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es la velocidad actual del viento?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 10,
    };
  }

  private createWindClassificationQuestion(id: number, data: ClimateData): inQuestion {
    const windSpeed = data.wind_speed;
    const colors = this.getRandomColors(4);
    
    let classification: string;
    if (windSpeed < 2) classification = 'Calma';
    else if (windSpeed < 6) classification = 'Brisa suave';
    else if (windSpeed < 12) classification = 'Brisa moderada';
    else if (windSpeed < 20) classification = 'Viento fuerte';
    else classification = 'Viento muy fuerte';

    const correctAnswer: inAnswer = {
      id: 1,
      description: classification,
      color: colors[0],
    };

    const allClassifications = ['Calma', 'Brisa suave', 'Brisa moderada', 'Viento fuerte', 'Viento muy fuerte'];
    const otherOptions = allClassifications.filter(opt => opt !== classification);
    const selectedOthers = otherOptions.sort(() => Math.random() - 0.5).slice(0, 3);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: selectedOthers[0], color: colors[1] },
      { id: 3, description: selectedOthers[1], color: colors[2] },
      { id: 4, description: selectedOthers[2], color: colors[3] },
    ];

    return {
      id,
      question: `Con un viento de ${windSpeed.toFixed(1)} m/s, se considera:`,
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 15,
    };
  }

  // ==================== PREGUNTAS COMBINADAS ====================

  private createTempRangeQuestion(id: number, data: ClimateData): inQuestion {
    const range = data.max_temp - data.min_temp;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${range.toFixed(1)}°C`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(range + Math.random() * 3 + 1).toFixed(1)}°C`, color: colors[1] },
      { id: 3, description: `${Math.max(0, range - Math.random() * 2).toFixed(1)}°C`, color: colors[2] },
      { id: 4, description: `${(range + Math.random() * 5 + 3).toFixed(1)}°C`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es la amplitud térmica (diferencia entre temp. máxima y mínima)?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 20,
    };
  }

  private createComfortIndexQuestion(id: number, data: ClimateData): inQuestion {
    const temp = data.temperature;
    const humidity = data.humidity;
    const colors = this.getRandomColors(4);
    
    // Índice de confort simplificado
    let comfort: string;
    if (temp >= 20 && temp <= 26 && humidity >= 40 && humidity <= 70) {
      comfort = 'Muy confortable';
    } else if (temp >= 18 && temp <= 28 && humidity >= 30 && humidity <= 80) {
      comfort = 'Confortable';
    } else if (temp > 28 || humidity > 80) {
      comfort = 'Incómodo por calor/humedad';
    } else {
      comfort = 'Incómodo por frío/sequedad';
    }

    const correctAnswer: inAnswer = {
      id: 1,
      description: comfort,
      color: colors[0],
    };

    const allComforts = [
      'Muy confortable',
      'Confortable',
      'Incómodo por calor/humedad',
      'Incómodo por frío/sequedad'
    ];
    const otherOptions = allComforts.filter(opt => opt !== comfort);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: otherOptions[0], color: colors[1] },
      { id: 3, description: otherOptions[1], color: colors[2] },
      { id: 4, description: otherOptions[2], color: colors[3] },
    ];

    return {
      id,
      question: 'Considerando temperatura y humedad, ¿cómo es el confort térmico?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 25,
    };
  }

  private createTempTrendQuestion(id: number, data: ClimateData): inQuestion {
    const temps = data._arrays.T2M!;
    const colors = this.getRandomColors(4);
    
    const firstTemp = temps[0].value;
    const lastTemp = temps[temps.length - 1].value;
    const trend = lastTemp - firstTemp;

    let trendDescription: string;
    if (trend > 1) trendDescription = 'Calentamiento';
    else if (trend < -1) trendDescription = 'Enfriamiento';
    else trendDescription = 'Estable';

    const correctAnswer: inAnswer = {
      id: 1,
      description: trendDescription,
      color: colors[0],
    };

    const otherOptions = ['Calentamiento', 'Enfriamiento', 'Estable'].filter(
      opt => opt !== trendDescription
    );

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: otherOptions[0], color: colors[1] },
      { id: 3, description: otherOptions[1], color: colors[2] },
      { id: 4, description: 'Muy variable', color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál ha sido la tendencia de temperatura en los últimos días?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 20,
    };
  }

  // ==================== PREGUNTAS DE PRESIÓN ====================

  private createPressureQuestion(id: number, data: ClimateData): inQuestion {
    const pressure = data.pressure;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${pressure.toFixed(2)} kPa`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(pressure + Math.random() * 2 + 1).toFixed(2)} kPa`, color: colors[1] },
      { id: 3, description: `${(pressure - Math.random() * 1.5).toFixed(2)} kPa`, color: colors[2] },
      { id: 4, description: `${(pressure + Math.random() * 4 + 2).toFixed(2)} kPa`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es la presión atmosférica actual?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 10,
    };
  }

  private createPressureInterpretationQuestion(id: number, data: ClimateData): inQuestion {
    const pressure = data.pressure;
    const colors = this.getRandomColors(4);
    
    let interpretation: string;
    if (pressure > 102) interpretation = 'Alta presión - Clima estable';
    else if (pressure > 98) interpretation = 'Presión normal';
    else interpretation = 'Baja presión - Posible mal tiempo';

    const correctAnswer: inAnswer = {
      id: 1,
      description: interpretation,
      color: colors[0],
    };

    const allInterpretations = [
      'Alta presión - Clima estable',
      'Presión normal',
      'Baja presión - Posible mal tiempo',
      'Presión crítica'
    ];
    const otherOptions = allInterpretations.filter(opt => opt !== interpretation);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: otherOptions[0], color: colors[1] },
      { id: 3, description: otherOptions[1], color: colors[2] },
      { id: 4, description: otherOptions[2], color: colors[3] },
    ];

    return {
      id,
      question: `Con ${pressure.toFixed(1)} kPa de presión, ¿qué indica?`,
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 20,
    };
  }

  // ==================== PREGUNTAS DE RADIACIÓN SOLAR ====================

  private createSolarRadiationQuestion(id: number, data: ClimateData): inQuestion {
    const radiation = data.solar_radiation;
    const colors = this.getRandomColors(4);
    
    let condition: string;
    if (radiation > 25) condition = 'Muy soleado';
    else if (radiation > 15) condition = 'Soleado';
    else if (radiation > 8) condition = 'Parcialmente nublado';
    else condition = 'Nublado';

    const correctAnswer: inAnswer = {
      id: 1,
      description: condition,
      color: colors[0],
    };

    const allConditions = ['Muy soleado', 'Soleado', 'Parcialmente nublado', 'Nublado'];
    const otherOptions = allConditions.filter(opt => opt !== condition);

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: otherOptions[0], color: colors[1] },
      { id: 3, description: otherOptions[1], color: colors[2] },
      { id: 4, description: otherOptions[2], color: colors[3] },
    ];

    return {
      id,
      question: `Con ${radiation.toFixed(1)} kWh/m²/día de radiación, las condiciones son:`,
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 15,
    };
  }

  private createSolarRadiationValueQuestion(id: number, data: ClimateData): inQuestion {
    const radiation = data.solar_radiation;
    const colors = this.getRandomColors(4);
    
    const correctAnswer: inAnswer = {
      id: 1,
      description: `${radiation.toFixed(2)} kWh/m²/día`,
      color: colors[0],
    };

    const alternatives: inAnswer[] = [
      correctAnswer,
      { id: 2, description: `${(radiation + Math.random() * 5 + 2).toFixed(2)} kWh/m²/día`, color: colors[1] },
      { id: 3, description: `${Math.max(0, radiation - Math.random() * 4).toFixed(2)} kWh/m²/día`, color: colors[2] },
      { id: 4, description: `${(radiation + Math.random() * 8 + 5).toFixed(2)} kWh/m²/día`, color: colors[3] },
    ];

    return {
      id,
      question: '¿Cuál es el nivel de radiación solar registrado?',
      alternatives: this.shuffleArray(alternatives),
      correctAnswer,
      points: 15,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
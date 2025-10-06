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

export interface ClimateData {
  temperature: number;
  humidity: number;
  solar_radiation: number;
  wind_speed: number;
  pressure: number;
  max_temp: number;
  min_temp: number;
  _arrays: {
    T2M?: Array<{ date: string; value: number }>;
    RH2M?: Array<{ date: string; value: number }>;
    WS2M?: Array<{ date: string; value: number }>;
    PRECTOTCORR?: Array<{ date: string; value: number }>;
  };
}
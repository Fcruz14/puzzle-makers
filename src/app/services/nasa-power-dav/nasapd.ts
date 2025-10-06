// src/app/services/nasa-power.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface NasaPowerResponse {
  code: number;
  description: string;
  data: NasaPowerData | null;
}

export interface NasaPowerData {
  coordinates: { lat: string, lon: string };
  range: { start: string, end: string };
  parameters: NasaParameter[];
}

export interface NasaParameter {
  variable: string;
  values: Record<string, number>; // { YYYYMMDD: media }
}

@Injectable({ providedIn: 'root' })
export class NasaPowerService {
  private api = 'https://nasa-middleware-n13t.vercel.app/api/nasa-data.js';

  constructor(private http: HttpClient) {}

  getData(lat: number|string, lon: number|string, start?: string, end?: string, grid?: 0|1): Observable<NasaPowerResponse> {
    const today = new Date();
    const yyyymmdd = (d: Date) => d.toISOString().slice(0,10).replace(/-/g,'');
    const startDate = start || yyyymmdd(new Date(today.setDate(today.getDate()-7)));
    const endDate = end || yyyymmdd(new Date());

    const url = `${this.api}?lat=${lat}&lon=${lon}&start=${startDate}&end=${endDate}${grid ? `&grid=${grid}` : ''}`;

    return this.http.get<NasaPowerResponse>(url).pipe(
      map(res => {
        if (res.code !== 200 || !res.data) return res;

        // Función helper para obtener último valor de una variable
        const lastValue = (variable: string) => {
          const param = res.data!.parameters.find(p => p.variable === variable);
          if (!param) return 'N/A';
          const dates = Object.keys(param.values).sort();
          return dates.length ? param.values[dates[dates.length - 1]] : 'N/A';
        };

        // Función helper para convertir a array { date, value } si se quiere graficar
        const toArray = (variable: string) => {
          const param = res.data!.parameters.find(p => p.variable === variable);
          if (!param) return [];
          return Object.entries(param.values).map(([date, value]) => ({ date, value }));
        };

        return {
          ...res,
          data: {
            ...res.data,
            // últimos valores
            temperature: lastValue('T2M'),
            humidity: lastValue('RH2M'),
            solar_radiation: lastValue('ALLSKY_SFC_SW_DWN'),
            wind_speed: lastValue('WS2M'),
            pressure: lastValue('PS'),
            max_temp: lastValue('T2M_MAX'),
            min_temp: lastValue('T2M_MIN'),
            // helper arrays para graficar
            _arrays: res.data.parameters.reduce((acc:any, p) => {
              acc[p.variable] = toArray(p.variable);
              return acc;
            }, {})
          }
        };
      })
    );
  }
}
